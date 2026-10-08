import i18n from "@/Utils/I18n/i18n";
import { api, requireEndpoint } from "./client";
import { portalHeaders } from "./portalHeaders";
import { readBlobPayload, toApiRequestError } from "./apiErrors";

// One call to the merchant API. Every reply is { status, code, message,
// data: [ ... ] }; `message` is the API's own words for the user and is shown
// as is. Resolves to { data: <first item>, message }; a refusal throws an
// ApiRequestError carrying that message (and `status`, the HTTP status).
//
// `signedIn: false` is for the calls before sign-in (otp, activate, login,
// refresh, password_reset): they carry the portal's Basic credential. Every
// other call carries the merchant's Bearer token (added by the client).
// A call that answers with a file (a CSV). A refusal is still JSON: it is read
// back so its message can be shown. Resolves to { blob, filename }.
export async function portalDownload(endpoint, body = {}) {
  try {
    const response = await api.post(requireEndpoint(endpoint), body, { responseType: "blob" });
    const type = response.headers?.["content-type"] ?? "";
    if (type.includes("json")) {
      const payload = await readBlobPayload(response.data);
      throw toApiRequestError(payload, response.status, i18n.t("common.requestFailed"));
    }
    const named = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(response.headers?.["content-disposition"] ?? "");
    return { blob: response.data, filename: named ? decodeURIComponent(named[1]) : "" };
  } catch (error) {
    if (error.name === "ApiRequestError") throw error;
    if (error.response) {
      const payload = await readBlobPayload(error.response.data);
      throw toApiRequestError(payload, error.response.status, i18n.t("common.requestFailed"));
    }
    throw new Error(i18n.t("common.requestFailed"));
  }
}

export async function portalPost(endpoint, body = {}, { signedIn = true } = {}) {
  try {
    const response = await api.post(requireEndpoint(endpoint), body, signedIn ? undefined : { skipAuth: true, headers: portalHeaders() });
    const payload = response.data;
    if (String(payload?.status).toLowerCase() === "fail" || payload?.code === 0) {
      throw toApiRequestError(payload, response.status, i18n.t("common.requestFailed"));
    }
    const rows = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
    // `data` is the first item; `rows` the whole list (for calls that answer with one).
    return { data: rows[0] ?? null, rows, message: payload?.message ?? "" };
  } catch (error) {
    if (error.name === "ApiRequestError") throw error;
    if (error.response) {
      const payload = await readBlobPayload(error.response.data);
      throw toApiRequestError(payload, error.response.status, i18n.t("common.requestFailed"));
    }
    // No reply at all (offline, blocked): no API message, so the app's own.
    throw new Error(i18n.t("common.requestFailed"));
  }
}
