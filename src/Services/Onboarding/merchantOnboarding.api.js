import { portalRequest } from "@/Services/api/request";
import { API_ENDPOINTS, MERCHANT_INST_PROFILE_ID, MERCHANT_PORTAL_AUTHORIZATION } from "@/Utils/Constant";

// Merchant self-onboarding (Sign up), one flow per kind: individual or
// corporate, under /merchant/web. Same calls as the customer portal's
// onboarding; only the prefix and the credential differ. start / loadWizard
// / saveSection / submit / discard resolve to { data: <the form>, message }
// so the screen can show the API's own message.
const firstOf = (payload) => (Array.isArray(payload?.data) ? payload.data[0] : payload?.data) ?? null;
const result = (payload) => ({ data: firstOf(payload), message: payload?.message ?? "" });

function createMerchantOnboardingApi(paths) {
  const call = (path, body, options) => portalRequest(path, body, { authorization: MERCHANT_PORTAL_AUTHORIZATION, ...options });
  // options and add name the institution; every other call works from the
  // onboarding's reference_id.
  const withInstitution = (payload = {}) => (MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID, ...payload } : payload);
  return {
    loadOptions: async () => firstOf(await call(paths.OPTIONS, withInstitution())),
    start: async (payload) => result(await call(paths.ADD, withInstitution(payload))),
    loadWizard: async (referenceId) => result(await call(paths.GET, { reference_id: referenceId })),
    saveSection: async (payload) => result(await call(paths.EDIT, payload)),
    submit: async (payload) => result(await call(paths.SUBMIT, payload)),
    // Throws away an unfinished onboarding (answers and files) so the
    // contact can start afresh or in another role. A completed one can't be.
    discard: async (referenceId) => result(await call(paths.DISCARD, { reference_id: referenceId })),
    // Stores one file for a `file` field; resolves to { path, file_name, ... }.
    // `path` is what the section is then saved with.
    uploadFile: async ({ referenceId, sectionCode, field, typeId, file }) => {
      const form = new FormData();
      form.append("reference_id", referenceId);
      form.append("section_code", sectionCode);
      form.append("field", field);
      if (typeId != null && typeId !== "") form.append("type_id", String(typeId));
      form.append("file", file);
      return firstOf(await call(paths.UPLOAD, form));
    },
    // Resolves to the stored file itself, as a Blob.
    downloadFile: (referenceId, path) => call(paths.FILE, { reference_id: referenceId, path }, { responseType: "blob" }),
  };
}

export const merchantOnboardingApi = {
  individual: createMerchantOnboardingApi(API_ENDPOINTS.MERCHANT_ONBOARDING.INDIVIDUAL),
  corporate: createMerchantOnboardingApi(API_ENDPOINTS.MERCHANT_ONBOARDING.CORPORATE),
};
