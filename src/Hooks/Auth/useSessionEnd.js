import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { readSessionEnd } from "@/Services/api/authStorage";
import { SESSION_END_WARN_SECONDS } from "@/Utils/Constant";
import { notifications } from "@/Utils/Lib/notifications";
import { useSignOut } from "./useSignOut";

const CHECK_MS = 1000;

// A session has a last moment (`refresh_expires_at` of the sign-in reply, the
// start plus `session.max_seconds`) after which only a new sign-in works, however
// active the customer is. A minute or two before it they are told; at it they are
// signed out with a note. Timestamps, not timers, so a sleeping laptop is handled
// on return. Returns { secondsLeft, dismiss }: `secondsLeft` is null until the
// warning is due (and after it was dismissed).
export function useSessionEnd() {
  const { t } = useTranslation();
  const signOut = useSignOut();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const end = readSessionEnd();
      if (!end) return;
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(timer);
        setSecondsLeft(null);
        notifications.info(t("auth.sessionEnded", { defaultValue: "Your session has ended. Sign in again to continue." }));
        void signOut();
      } else if (left <= SESSION_END_WARN_SECONDS) {
        setSecondsLeft(left);
      } else {
        setSecondsLeft((value) => (value == null ? value : null));
      }
    }, CHECK_MS);
    return () => window.clearInterval(timer);
  }, [signOut, t]);

  const dismiss = useCallback(() => setDismissed(true), []);
  return { secondsLeft: dismissed ? null : secondsLeft, dismiss };
}
