import { API_ENDPOINTS, INST_PROFILE_ID } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";
import { getStoredAccessToken } from "@/Services/api/authStorage";

// The institution's documents (terms, privacy and others) for this portal,
// in the portal's language. Before sign-in they are asked for with the
// portal's credential and the institution; signed in, with the user's token,
// and they then say what the user has accepted.
const signedIn = () => Boolean(getStoredAccessToken());
const withBank = (body) => (signedIn() || !INST_PROFILE_ID ? body : { inst_profile_id: INST_PROFILE_ID, ...body });

// [{ code, name, title, requires_acceptance, version_id, version_no, content_format, needs_acceptance?, accepted_version_no? }]
export const listDocuments = () => portalPost(API_ENDPOINTS.DOCUMENT.LIST, withBank({}), { signedIn: signedIn() }).then((r) => r.rows);

// One document with its `content`.
export const getDocument = (code) => portalPost(API_ENDPOINTS.DOCUMENT.GET, withBank({ code }), { signedIn: signedIn() }).then((r) => r.data);

// Signed in only: the versions the user accepts.
export const acceptDocuments = (versionIds) => portalPost(API_ENDPOINTS.DOCUMENT.ACCEPT, { version_ids: versionIds });

// What was accepted on the sign-up page, recorded after the first sign-in.
const CONSENT_KEY = "documents.acceptAfterSignIn";
export function rememberConsent(versionIds) {
  try {
    if (versionIds.length) window.localStorage.setItem(CONSENT_KEY, JSON.stringify(versionIds));
  } catch {
    // Storage unavailable: the sign-in dialog asks again instead.
  }
}
export function takeConsent() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "[]");
    window.localStorage.removeItem(CONSENT_KEY);
    return Array.isArray(ids) ? ids.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}
