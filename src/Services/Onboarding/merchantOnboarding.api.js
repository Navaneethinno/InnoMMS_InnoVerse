import { portalRequest } from "@/Services/api/request";
import { API_ENDPOINTS, MERCHANT_INST_PROFILE_ID, MERCHANT_PORTAL_AUTHORIZATION } from "@/Utils/Constant";

// Merchant self-onboarding (Sign up), one flow per kind: individual or
// corporate, under /merchant/{kind}/web ("Merchant web: onboarding API").
// add / get / next / back reply with the same "screen": the registration,
// its progress and the ONE section to show. Every call resolves to
// { data: <the screen or result>, message } so the page can show the API's
// own message.
const firstOf = (payload) => (Array.isArray(payload?.data) ? payload.data[0] : payload?.data) ?? null;
const result = (payload) => ({ data: firstOf(payload), message: payload?.message ?? "" });

function createMerchantOnboardingApi(paths) {
  const call = async (path, body, options) =>
    portalRequest(path, body, { authorization: MERCHANT_PORTAL_AUTHORIZATION, ...options });
  // options and add name the institution; every other call works from the
  // registration's reference_id.
  const withInstitution = (payload = {}) => (MERCHANT_INST_PROFILE_ID ? { inst_profile_id: MERCHANT_INST_PROFILE_ID, ...payload } : payload);
  return {
    loadOptions: async () => firstOf(await call(paths.OPTIONS, withInstitution())),
    // Starts a registration, or carries on the open one for this contact.
    start: async (payload) => result(await call(paths.ADD, withInstitution(payload))),
    // Reopens a registration at the section where it stopped.
    get: async (referenceId) => result(await call(paths.GET, { reference_id: referenceId })),
    // Saves the section being left (data replaces what was saved there;
    // leave it out to move on unchanged) and replies with the next section,
    // or the same one with its issues when something is still missing.
    next: async (payload) => result(await call(paths.NEXT, payload)),
    // The section before the one being left, with its saved answers. Saves nothing.
    back: async (referenceId, sectionKey) => result(await call(paths.BACK, { reference_id: referenceId, section_key: sectionKey })),
    submit: async (payload) => result(await call(paths.SUBMIT, payload)),
    // Throws away an unfinished registration (answers and files) so the
    // contact can start afresh or in another role. A finished one can't be.
    discard: async (referenceId) => result(await call(paths.DISCARD, { reference_id: referenceId })),
    // Stores one file for a `file` question; resolves to { path, file_name, ... }.
    // `path` is then the question's answer.
    uploadFile: async ({ referenceId, field, side, file }) => {
      const form = new FormData();
      form.append("reference_id", referenceId);
      form.append("field", field);
      if (side) form.append("side", side);
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
