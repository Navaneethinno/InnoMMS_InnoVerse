import { STORAGE_KEYS } from "@/Utils/Constant";
// The signed-in session: a short-lived access token (JWT, 15 minutes) and a
// refresh token (30 days) that changes on every refresh. Kept in
// sessionStorage (gone when the tab closes), with an in-memory copy for
// browsers that block it.
let memorySession = null;
export function isTokenExpired(token, marginSeconds = 0) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")),
    );
    return !Number.isFinite(decoded.exp) || decoded.exp * 1000 - marginSeconds * 1000 <= Date.now();
  } catch {
    return true;
  }
}
function readSession() {
  try {
    return (
      JSON.parse(window.sessionStorage.getItem(STORAGE_KEYS.session)) ||
      memorySession
    );
  } catch {
    return memorySession;
  }
}
// The raw access token, even when about to expire (the client refreshes it).
export function getStoredAccessToken() {
  return readSession()?.accessToken || null;
}
export function getAccessToken() {
  const token = getStoredAccessToken();
  return token && !isTokenExpired(token) ? token : null;
}
export function getRefreshToken() {
  const session = readSession();
  if (!session?.refreshToken) return null;
  if (session.refreshExpiresAt && new Date(session.refreshExpiresAt).getTime() <= Date.now()) return null;
  return session.refreshToken;
}
// Signed in = a refresh token that still works; the access token is renewed
// from it whenever needed.
export function hasSession() {
  return Boolean(getRefreshToken());
}
// The session's timing from sign-in / refresh: { idle_timeout_seconds,
// access_ttl_seconds, max_seconds }, or null.
export function readSessionPolicy() {
  return hasSession() ? readSession()?.sessionPolicy || null : null;
}
// The session's last moment (ms): `refresh_expires_at` of the sign-in reply, the
// start plus the maximum. After it only a new sign-in works. Null when unknown.
export function readSessionEnd() {
  const at = hasSession() ? new Date(readSession()?.refreshExpiresAt).getTime() : NaN;
  return Number.isFinite(at) ? at : null;
}
export function readAuthUser() {
  return hasSession() ? readSession()?.user || null : null;
}
export function persistAuthSession(user, accessToken, refreshToken, refreshExpiresAt, sessionPolicy = null) {
  memorySession = { user, accessToken, refreshToken, refreshExpiresAt, sessionPolicy };
  try {
    window.sessionStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify(memorySession),
    );
  } catch {
    /* In-memory fallback for restricted storage. */
  }
}
export function updateAuthUser(user) {
  const session = readSession();
  if (session) persistAuthSession(user, session.accessToken, session.refreshToken, session.refreshExpiresAt, session.sessionPolicy);
}
export function clearAuthSession() {
  memorySession = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    /* Storage may be unavailable. */
  }
}
