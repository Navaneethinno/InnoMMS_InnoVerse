import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { login } from "@/Services/Auth/auth.api";
import { persistAuthSession } from "@/Services/api/authStorage";
import { sessionEstablished } from "@/Redux/slices/authSlice";
import { LOGIN_PAUSE_MS, STORAGE_KEYS } from "@/Utils/Constant";
// How long sign-in stays off after a refusal, in ms (0: not at all). Too many
// attempts from here: a fixed few minutes. A locked account: until the time the
// API names at the end of its remark ("locked until 2026-10-06T11:37:07Z"), or
// the whole 15 minutes if it cannot be read.
const LOGIN_LOCK_FALLBACK_MS = 15 * 60 * 1000;
function restAfter(cause) {
  if (cause.errorCode === "portal.too_many_attempts") return LOGIN_PAUSE_MS;
  if (cause.errorCode !== "portal.login_locked") return 0;
  // The reply says when it opens: seconds from now, or the UTC time (the end of
  // the remark is read only for an older server).
  if (Number(cause.retryAfterSeconds) > 0) return Number(cause.retryAfterSeconds) * 1000 + 1000;
  const until = Date.parse(cause.lockedUntil ?? /(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s*$/.exec(cause.remark ?? "")?.[1] ?? "");
  return Number.isFinite(until) ? Math.max(0, until - Date.now()) + 1000 : LOGIN_LOCK_FALLBACK_MS;
}

export function useLogin() {
  const dispatch = useDispatch();
  const [pending, setPending] = useState(false);
  // The API's own words for a refusal (wrong password, locked, disabled...).
  const [error, setError] = useState(null);
  // Too many failed sign-ins from this device or address: the button rests a few
  // minutes (every sign-in from here is refused meanwhile, correct ones too).
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const submit = async (credentials) => {
    setPending(true);
    setError(null);
    try {
      const session = await login(credentials);
      persistAuthSession(session.user, session.accessToken, session.refreshToken, session.refreshExpiresAt, session.sessionPolicy);
      // A new sign-in starts with the sidebar open and pinned.
      try {
        window.localStorage.removeItem(STORAGE_KEYS.sidebarCollapsed);
      } catch {
        /* Nothing to forget. */
      }
      dispatch(sessionEstablished(session.user));
      return true;
    } catch (cause) {
      setError({ message: cause.message, code: cause.errorCode });
      const rest = restAfter(cause);
      if (rest) {
        setPaused(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setPaused(false), rest);
      }
      return false;
    } finally {
      setPending(false);
    }
  };
  return { submit, pending, error, paused };
}
