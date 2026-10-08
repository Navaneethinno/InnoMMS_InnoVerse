import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalDownload, portalPost } from "@/Services/api/portalRequest";

const { KYC } = API_ENDPOINTS;

// Where the merchant stands: { reference_id, kyc_level_no, target_level_no,
// top_level_no, state, can_upgrade, kyc_scheme_name, no_kyc_levels }.
// `state` is NONE, IN_PROGRESS, WAITING, REJECTED (`narration` is the
// checker's reason), AT_TOP or LOCKED.
export const loadKycStatus = async () => (await portalPost(KYC.STATUS)).data;

// The upgrade's screens are the sign-up's (section, checkpoint, progress), for
// the signed-in merchant's own details, so the sign-up wizard draws them. This
// is the same shape as an onboarding flow's api; the server works from the
// session, so there is no reference to send back.
const screen = (reply, referenceId) => ({
  message: reply.message,
  data: reply.data && { ...reply.data, onboarding: { reference_id: referenceId, editable: true, ...reply.data.onboarding } },
});
const referenceOf = (reply, fallback) => reply.data?.onboarding?.reference_id ?? reply.data?.reference_id ?? fallback ?? "kyc-upgrade";

export const kycUpgradeFlow = {
  // No picker: the first missing screen is asked for when the page opens.
  autoStart: true,
  start: async () => {
    const reply = await portalPost(KYC.UPGRADE, {});
    return screen(reply, referenceOf(reply));
  },
  // `sectionKey` alone only shows that screen; nothing is saved.
  loadWizard: async (referenceId, sectionKey) => screen(await portalPost(KYC.UPGRADE, sectionKey ? { section_key: sectionKey } : {}), referenceId),
  back: async ({ section_key: sectionKey, reference_id: referenceId }) => screen(await portalPost(KYC.UPGRADE_BACK, { section_key: sectionKey }), referenceId),
  next: async ({ section_key: sectionKey, data }) => {
    const reply = await portalPost(KYC.UPGRADE, { section_key: sectionKey, ...(data !== undefined ? { data } : {}) });
    return screen(reply, referenceOf(reply));
  },
  submit: async () => {
    const reply = await portalPost(KYC.UPGRADE_SUBMIT, {});
    return screen(reply, referenceOf(reply));
  },
  discard: async () => {
    const reply = await portalPost(KYC.UPGRADE_CANCEL, {});
    return { data: reply.data, message: reply.message };
  },
  // Stores one photo or document: resolves to { path, ... }, which is the
  // field's answer when the screen is saved.
  uploadFile: async ({ field, side, file }) => {
    const form = new FormData();
    form.append("field", field);
    if (side) form.append("side", side);
    form.append("file", file);
    return (await portalPost(KYC.UPGRADE_UPLOAD, form)).data;
  },
  // A stored file as a Blob.
  downloadFile: async (referenceId, path) => (await portalDownload(KYC.UPGRADE_FILE, { path })).blob,
};
