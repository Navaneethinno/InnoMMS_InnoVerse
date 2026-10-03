import {
  API_BASE_URL,
  MERCHANT_ACCOUNT_BASE,
  MERCHANT_INST_PROFILE_ID,
  MERCHANT_PORTAL_AUTHORIZATION,
} from "@/Utils/Constant";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";
import { getApiErrorMessage } from "@/Services/api/apiErrors";

const SESSION_KEY = "innomms:merchant-session";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
};
export const merchantSession = {
  read,
  save(value) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event("merchant:session"));
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("merchant:session"));
  },
};
const first = (payload) => (Array.isArray(payload?.data) ? payload.data[0] : payload?.data);
let refreshing;

async function send(path, body = {}, mode = "access", retry = true) {
  const session = read();
  const authorization =
    mode === "basic"
      ? MERCHANT_PORTAL_AUTHORIZATION
      : session?.access_token
        ? `Bearer ${session.access_token}`
        : "";
  if (!authorization)
    throw new Error(
      mode === "basic" ? "Merchant portal credential is not configured" : "Sign in to continue",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_BASE_URL}${MERCHANT_ACCOUNT_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 && mode === "access" && retry && session?.refresh_token) {
      try {
        await refresh();
        return send(path, body, mode, false);
      } catch {
        merchantSession.clear();
        throw new Error(payload?.message || "Your session has ended. Sign in again.");
      }
    }
    if (!response.ok || payload?.code === 0 || String(payload?.status).toLowerCase() === "fail") {
      const error = new Error(getApiErrorMessage(payload, `Request failed (${response.status})`));
      error.status = response.status;
      throw error;
    }
    return { data: first(payload), message: payload?.message || "" };
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function refresh() {
  if (!refreshing)
    refreshing = (async () => {
      const current = read();
      if (!current?.refresh_token) throw new Error("No refresh token");
      const { data } = await send(
        "/auth/refresh",
        { refresh_token: current.refresh_token },
        "basic",
        false,
      );
      if (!data?.access_token || !data?.refresh_token) throw new Error("Session refresh failed");
      merchantSession.save({ ...current, ...data });
      return data;
    })().finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export const merchantAccountApi = {
  otp: (loginId, purpose) =>
    send(
      "/auth/otp",
      { inst_profile_id: MERCHANT_INST_PROFILE_ID, login_id: loginId, purpose },
      "basic",
    ),
  activate: (body) => send("/auth/activate", body, "basic"),
  login: async (loginId, password) => {
    const result = await send(
      "/auth/login",
      { inst_profile_id: MERCHANT_INST_PROFILE_ID, login_id: loginId, password },
      "basic",
    );
    if (!result.data?.access_token) throw new Error("No access token in sign-in response");
    merchantSession.save(result.data);
    return result;
  },
  me: () => send("/auth/me"),
  logout: async (all = false) => {
    try {
      return await send("/auth/logout", all ? { all: true } : {});
    } finally {
      merchantSession.clear();
    }
  },
  passwordReset: (body) => send("/auth/password_reset", body, "basic"),
  passwordChange: (current, next) => send("/auth/password_change", { current, new: next }),
  pinChange: (current, next) => send("/auth/pin_change", { current, new: next }),
  pinResetStart: () => send("/auth/pin_reset_start"),
  pinReset: (body) => send("/auth/pin_reset", body),
  wallets: () => send("/account/wallets"),
  history: (body) => send("/account/history", body),
  transaction: (rrn) => send("/account/transaction", { rrn }),
  quote: (orgRrn, amount) =>
    send("/account/quote", { txn_type: "MERCHANT_REFUND", org_rrn: orgRrn, amount }),
  refund: (body) => send("/account/send", { txn_type: "MERCHANT_REFUND", ...body }),
  receipt: (rrn, duplicate = false) =>
    send("/account/receipt", {
      ...(rrn ? { rrn } : {}),
      ...(duplicate ? { duplicate: true } : {}),
    }),
};
