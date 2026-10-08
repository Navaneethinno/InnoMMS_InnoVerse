import i18n from "@/Utils/I18n/i18n";
import { API_ENDPOINTS, INST_PROFILE_ID, PORTAL_AUTHORIZATION } from "@/Utils/Constant";
import { api, requireEndpoint } from "@/Services/api/client";
import { readBlobPayload, toApiRequestError } from "@/Services/api/apiErrors";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

const portalHeaders = () => ({
  ...(PORTAL_AUTHORIZATION ? { Authorization: PORTAL_AUTHORIZATION } : {}),
  ...apiLanguageHeader(),
});

// The bank's approved theme colours. Resolves to { primary_color,
// secondary_color, logo, favicon }
// (logo/favicon are stored paths, "" when none), or null when the bank has none set up (200 with
// `data: []`), in which case the portal keeps its default colours.
// Refusals (404 unknown bank, 400 bad request) reject with the API's own
// message.
// The same call is made once per visit: pages and remounts share the one
// answer (a failed call is forgotten so a retry can go out).
const shared = new Map();
const once = (key, call) => {
  if (!shared.has(key)) shared.set(key, call().catch((error) => (shared.delete(key), Promise.reject(error))));
  return shared.get(key);
};

export const fetchBranding = () => once(`branding:${JSON.stringify(apiLanguageHeader())}`, loadBranding);
export const fetchBrandingFile = (path) => once(`file:${path}`, () => loadBrandingFile(path));

async function loadBranding() {
  try {
    const { data: payload } = await api.post(
      requireEndpoint(API_ENDPOINTS.BRANDING.GET),
      { inst_profile_id: INST_PROFILE_ID },
      {
        skipAuth: true,
        headers: portalHeaders(),
      },
    );
    if (String(payload?.status).toLowerCase() === "fail") {
      throw toApiRequestError(payload, 200, i18n.t("common.requestFailed"));
    }
    return payload?.data?.[0]?.branding ?? null;
  } catch (error) {
    if (error.name === "ApiRequestError") throw error;
    // Only a reply in the API's own format carries a message worth showing.
    if (error.response?.data?.message) {
      throw toApiRequestError(error.response.data, error.response.status, i18n.t("common.requestFailed"));
    }
    throw new Error(i18n.t("common.requestFailed"));
  }
}

// The bank's approved logo or favicon image, as a Blob, by the path
// `/branding` returned (passed back unchanged). A 404 resolves to null so
// the default mark stays.
async function loadBrandingFile(path) {
  try {
    const { data } = await api.post(
      requireEndpoint(API_ENDPOINTS.BRANDING.FILE),
      { inst_profile_id: INST_PROFILE_ID, path },
      { skipAuth: true, responseType: "blob", headers: portalHeaders() },
    );
    return data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    const payload = await readBlobPayload(error.response?.data);
    if (payload?.message) {
      throw toApiRequestError(payload, error.response.status, i18n.t("common.requestFailed"));
    }
    throw new Error(i18n.t("common.requestFailed"));
  }
}
