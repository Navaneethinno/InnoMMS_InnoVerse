import { portalRequest } from "@/Services/api/request";
import { API_ENDPOINTS, MERCHANT_INST_PROFILE_ID, MERCHANT_PORTAL_AUTHORIZATION } from "@/Utils/Constant";

// The institution's approved branding for the merchant portal's public
// pages: { primary_color, secondary_color, logo, favicon } (stored paths,
// "" when none), or null when it has none set up.
export async function fetchMerchantBranding() {
  const payload = await portalRequest(
    API_ENDPOINTS.MERCHANT_BRANDING,
    MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID } : {},
    { authorization: MERCHANT_PORTAL_AUTHORIZATION },
  );
  const first = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
  return first?.branding ?? null;
}
