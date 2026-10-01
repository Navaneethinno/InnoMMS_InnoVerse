import { portalRequest } from "@/Services/api/request";
import { API_ENDPOINTS, MERCHANT_INST_PROFILE_ID, MERCHANT_PORTAL_AUTHORIZATION } from "@/Utils/Constant";

// The institution's approved branding for the merchant portal (same fields
// as the login reply's `branding`, see Utils/Lib/branding.js), or null when
// it has none set up. Public: works before sign-in.
export async function fetchMerchantBranding() {
  const payload = await portalRequest(
    API_ENDPOINTS.MERCHANT_BRANDING,
    MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID } : {},
    { authorization: MERCHANT_PORTAL_AUTHORIZATION },
  );
  const first = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  return first?.branding ?? null;
}

// One of the branding's stored images (logo, favicon, login background) as
// a Blob, by the path the branding returned. Public, like the branding.
export async function fetchMerchantBrandingFile(path) {
  return portalRequest(
    `${API_ENDPOINTS.MERCHANT_BRANDING}/file`,
    { ...(MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID } : {}), path },
    { authorization: MERCHANT_PORTAL_AUTHORIZATION, responseType: "blob" },
  );
}
