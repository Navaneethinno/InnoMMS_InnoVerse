import { loadProfileFile, listAvatarPresets, setAvatar, removeAvatar, uploadAvatar } from "@/Services/Profile/profile.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { loadProfileFile, listAvatarPresets, setAvatar, removeAvatar, uploadAvatar };
export const useProfileActions = () => actions;
