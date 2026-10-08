import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalDownload, portalPost } from "@/Services/api/portalRequest";

const { PROFILE } = API_ENDPOINTS;

// The merchant's own page: { header, avatar, sections, documents, contact }.
export const loadProfile = async () => (await portalPost(PROFILE.GET)).data;

// One of their documents from sign-up, as an image: resolves to { blob }.
export const loadProfileFile = (path) => portalDownload(PROFILE.FILE, { path });

// The pictures the merchant can choose from: [{ code, label }].
export const listAvatarPresets = async () => (await portalPost(PROFILE.AVATAR_PRESETS)).rows;

// An avatar as an image: the merchant's own, or the preset `code`.
export const loadAvatarImage = (code) => portalDownload(PROFILE.AVATAR_IMAGE, code ? { code } : {});

// Each of these resolves to { data: { kind, code }, message }.
export const setAvatar = (code) => portalPost(PROFILE.AVATAR_SET, { code });
export const removeAvatar = () => portalPost(PROFILE.AVATAR_REMOVE);
export const uploadAvatar = (file) => {
  const form = new FormData();
  form.append("file", file);
  return portalPost(PROFILE.AVATAR_UPLOAD, form);
};
