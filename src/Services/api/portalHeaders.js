import { PORTAL_AUTHORIZATION } from "@/Utils/Constant";
import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Headers for calls made before sign-in: the portal's one fixed Basic
// credential, plus the language the API words its messages in.
export const portalHeaders = () => ({
  ...(PORTAL_AUTHORIZATION ? { Authorization: PORTAL_AUTHORIZATION } : {}),
  ...apiLanguageHeader(),
});
