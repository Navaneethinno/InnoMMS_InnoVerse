import { API_ENDPOINTS, INST_PROFILE_ID } from "@/Utils/Constant";
import { hasSession } from "@/Services/api/authStorage";
import { portalPost } from "@/Services/api/portalRequest";

// The institution's languages, in its own order: a list of { id, name
// (English), code, status_name }. Before sign-in it carries the portal's Basic
// credential and must name the institution; after it the Bearer token's
// institution is used.
export const loadLanguages = async () => {
  const signedIn = hasSession();
  return (await portalPost(API_ENDPOINTS.LANGUAGE, signedIn ? {} : { inst_profile_id: INST_PROFILE_ID }, { signedIn })).rows;
};
