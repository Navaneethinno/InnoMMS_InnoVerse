import { API_ENDPOINTS } from "@/Utils/Constant";
import { hasSession } from "@/Services/api/authStorage";
import { portalPost } from "@/Services/api/portalRequest";

// The languages the platform offers (the same for every institution): a list of
// { id, name (English), code, status_name }. Before sign-in it carries the
// portal's Basic credential, after it the Bearer token.
export const loadLanguages = async () => (await portalPost(API_ENDPOINTS.LANGUAGE, {}, { signedIn: hasSession() })).rows;
