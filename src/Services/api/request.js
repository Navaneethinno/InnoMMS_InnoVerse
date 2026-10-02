import { API_BASE_URL, MERCHANT_DIGITAL_PRODUCT_ID } from "@/Utils/Constant";
import { clearAuthSession, getAccessToken } from "@/Services/api/authStorage";
import { getApiErrorMessage, getStatusErrorMessage } from "@/Services/api/apiErrors";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const REQUEST_TIMEOUT = 10000;

// The one request helper every *.api.js uses. All backend calls are POST with
// a JSON body and the same headers:
//   Content-Type, Deviceinfo, Authorization: Bearer <jwt>, x-api-lang
// Response envelope: { api, code, data: [...], pagination?, filter?, sort_by?,
//                      message, remark, status: "Success" | "Fail" }
// Errors throw an Error whose message is `message` + data[0].problems
// (never `remark`) — see apiErrors.js. 401 clears the session and fires
// "auth:unauthorized" (AppLayout sends the user to /login).
export async function apiRequest(path, body = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...apiLanguageHeader(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (response.headers.get("content-type") ?? "").includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    if (response.status === 401) {
      clearAuthSession();
      window.dispatchEvent(new Event("auth:unauthorized"));
      throw new Error("Session expired. Please sign in again.");
    }
    const statusError = getStatusErrorMessage(response.status);
    if (statusError) throw new Error(statusError);
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      throw new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}

// Rows out of a list/get response, tolerant of the few envelope shapes seen.
export const rowsOf = (response) =>
  Array.isArray(response?.data) ? response.data : (response?.data?.data ?? response?.data?.list ?? []);

// The public (no-login) portal APIs, e.g. merchant self-onboarding under
// /merchant/web: same envelope and error text as apiRequest, but the caller
// passes the portal's own Authorization header instead of a Bearer token.
// A FormData body goes out as multipart; `responseType: "blob"` returns the
// file itself. Errors carry `status` (409 means a conflict the screen offers
// a way out of).
export async function portalRequest(path, body = {}, { authorization, responseType } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  const multipart = body instanceof FormData;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...(multipart ? {} : { "Content-Type": "application/json" }),
        Deviceinfo: JSON.stringify(DEVICE_INFO),
        ...(authorization ? { Authorization: authorization } : {}),
        ...(MERCHANT_DIGITAL_PRODUCT_ID ? { "X-Digital-Product-Id": String(MERCHANT_DIGITAL_PRODUCT_ID) } : {}),
        ...apiLanguageHeader(),
      },
      body: multipart ? body : JSON.stringify(body),
      signal: controller.signal,
    });
    const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
    if (responseType === "blob" && response.ok && !isJson) return await response.blob();
    const payload = isJson ? await response.json().catch(() => null) : null;
    if (!response.ok || String(payload?.status).toLowerCase() === "fail") {
      const error = new Error(getApiErrorMessage(payload, `Request failed with status ${response.status}`));
      error.status = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Request timed out");
    throw error instanceof Error ? error : new Error("Unexpected API error");
  } finally {
    window.clearTimeout(timeout);
  }
}
