import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS, DIGITAL_PRODUCT_ID } from "@/Utils/Constant";
import {
  getRefreshToken,
  getStoredAccessToken,
  isTokenExpired,
  persistAuthSession,
  readAuthUser,
  readSessionPolicy,
  clearAuthSession,
} from "./authStorage";
import { ApiConfigurationError, readBlobPayload } from "./apiErrors";
import { authContract } from "./authContract";
import { deviceInfoHeader } from "./deviceInfo";
import { notifications } from "@/Utils/Lib/notifications";
import { portalHeaders } from "./portalHeaders";
import { noteEnvironment } from "./environment";
import { forgetCredentialKey, sealBody, syncClock } from "./credentialSeal";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";
export function requireEndpoint(endpoint) {
  if (!API_BASE_URL || !endpoint) throw new ApiConfigurationError();
  return endpoint;
}
// When the portal last called the API: only API calls keep the server session
// alive (the live socket does not).
let lastApiAt = Date.now();
export const lastApiActivity = () => lastApiAt;

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
// Every reply, refused ones included, says which environment the API runs as.
for (const client of [api, refreshClient]) {
  client.interceptors.response.use(
    (response) => {
      noteEnvironment(response.headers);
      return response;
    },
    (error) => {
      noteEnvironment(error.response?.headers);
      return Promise.reject(error);
    },
  );
}
// One notice for a burst of refused calls (a page loads several at once).
let lastLocationNotice = 0;
function noticeLocationBlocked(message) {
  if (Date.now() - lastLocationNotice < 10000) return;
  lastLocationNotice = Date.now();
  notifications.error(message || "");
}
let refreshPromise = null;
// 403s that refuse one call to this user's role, not the session.
const ROLE_REFUSALS = new Set(["store.staff_not_allowed", "portal.super_agent_required"]);
// Refusals of the request itself, never of the session: store user rules
// (a manager editing a non-cashier, outside a shift), terminal profile limits
// and transaction routing (an issuer not accepted).
const keepsSession = (code) => ROLE_REFUSALS.has(code) || /^(store|pos|routing)\./.test(code ?? "");

// A new token pair from the refresh token. The refresh token changes every
// time, so the new one is stored straight away; concurrent callers share one
// refresh.
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = getRefreshToken();
      if (!token) throw new Error("No session to refresh");
      const response = await refreshClient.post(
        requireEndpoint(API_ENDPOINTS.AUTH.REFRESH_TOKEN),
        authContract.refreshPayload(token),
        {
          headers: {
            ...portalHeaders(),
            Deviceinfo: deviceInfoHeader(),
            ...(DIGITAL_PRODUCT_ID ? { "X-Digital-Product-Id": DIGITAL_PRODUCT_ID } : {}),
          },
        },
      );
      const session = authContract.session(response.data, readAuthUser());
      if (!session.accessToken || !session.refreshToken) throw new Error("Refresh failed");
      persistAuthSession(session.user, session.accessToken, session.refreshToken, session.refreshExpiresAt, session.sessionPolicy ?? readSessionPolicy());
      return session.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// A usable access token for non-request callers (the live channel): the
// stored one, or a renewed one when it is about to run out.
export async function freshAccessToken() {
  const token = getStoredAccessToken();
  if ((!token || isTokenExpired(token, 30)) && getRefreshToken()) return refreshSession().catch(() => null);
  return token;
}

api.interceptors.request.use(async (config) => {
  if (!API_BASE_URL) throw new ApiConfigurationError();
  // The device is recorded on every transaction; the digital product names
  // the account type opened at approval.
  lastApiAt = Date.now();
  config.headers.Deviceinfo = deviceInfoHeader();
  // The API words its messages in the language the portal is showing (nothing
  // is sent for English, the API's own default).
  // A retry can carry a previous language header. Remove it before applying
  // the current choice, including English (which uses the API default).
  config.headers.delete("x-api-lang");
  Object.assign(config.headers, apiLanguageHeader());
  if (DIGITAL_PRODUCT_ID) config.headers["X-Digital-Product-Id"] = DIGITAL_PRODUCT_ID;
  // Secrets in a JSON body are sealed with the platform's public key. The
  // plain body is kept so a retry seals afresh (an envelope works once).
  const plain = config._plain ?? config.data;
  if (plain && typeof plain === "object" && !(plain instanceof FormData)) {
    config._plain = plain;
    config.data = await sealBody(plain);
  }
  if (config.skipAuth) return config;
  // The access token lasts 15 minutes: renew it just before it runs out.
  let token = getStoredAccessToken();
  if ((!token || isTokenExpired(token, 30)) && getRefreshToken()) {
    token = await refreshSession().catch(() => token);
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => {
    syncClock(response.headers?.["x-server-time"]);
    return response;
  },
  async (error) => {
    const request = error.config;
    // A file call (an image, a statement) refuses in JSON too, but it arrives
    // as a Blob: read it, so the checks below see its error_code.
    if (error.response?.data instanceof Blob) {
      const payload = await readBlobPayload(error.response.data);
      if (payload) error.response.data = payload;
    }
    // A sealed secret the server refused as damaged or too old: load the key
    // again where it changed, seal afresh and send once more.
    const sealCode = error.response?.data?.error_code;
    if ((sealCode === "credential.envelope_invalid" || sealCode === "credential.envelope_expired") && request && !request._resealed) {
      request._resealed = true;
      if (sealCode === "credential.envelope_invalid") forgetCredentialKey();
      // The refusal says what time the server has: seal again by that clock.
      syncClock(error.response.data?.server_time ?? error.response.headers?.["x-server-time"]);
      return api(request);
    }
    // Three wrong PINs lock the transaction PIN: tell the screens, which then
    // point to the reset.
    if (error.response?.data?.error_code === "portal.pin_locked") window.dispatchEvent(new Event("merchant:pin-locked"));
    // Refused from where the user is (the institution's Access by Location
    // policy): say why and keep the session. The same token works again from
    // an allowed place. Only this code means it; other 403s are handled below.
    if (error.response?.data?.error_code === "access.location_blocked") {
      noticeLocationBlocked(error.response.data?.message);
      return Promise.reject(error);
    }
    // The institution disabled this merchant's access: say so and sign out.
    // A refusal of the call itself (keepsSession) leaves the session as it
    // is: the screen just says why.
    if (error.response?.status === 403 && request && !request.skipAuth && !keepsSession(error.response.data?.error_code)) {
      notifications.error(error.response.data?.message || "");
      clearAuthSession();
      window.dispatchEvent(new Event("merchant:session-expired"));
      return Promise.reject(error);
    }
    if (
      error.response?.status !== 401 ||
      !request ||
      request.skipAuth ||
      request._retry
    )
      return Promise.reject(error);
    request._retry = true;
    try {
      // Only the newest access token works, and every refresh replaces it. If
      // another call already renewed it while this one was in flight, use
      // that token: refreshing again would end the one the others now hold.
      const stored = getStoredAccessToken();
      const sent = String(request.headers.Authorization ?? "").replace(/^Bearer /, "");
      const token = stored && stored !== sent && !isTokenExpired(stored) ? stored : await refreshSession();
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    } catch (refreshError) {
      // Signed in again on another device: that sign-in replaced this
      // session, and the API's own message says so.
      const refused = refreshError?.response?.data;
      if (refused?.error_code === "auth.signed_in_elsewhere" && refused.message) notifications.error(refused.message);
      clearAuthSession();
      window.dispatchEvent(new Event("merchant:session-expired"));
      return Promise.reject(error);
    }
  },
);
