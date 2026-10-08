import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { lastApiActivity } from "@/Services/api/client";
import { readSessionPolicy } from "@/Services/api/authStorage";
import { loadMe } from "@/Services/Auth/auth.api";
import { IDLE_SIGN_OUT_SECONDS } from "@/Utils/Constant";
import { notifications } from "@/Utils/Lib/notifications";
import { useSignOut } from "./useSignOut";

const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"];
const CHECK_MS = 1000;
const WARN_SECONDS = 60;

// The server ends a web session after `idle_timeout_seconds` without an API
// call (the live socket does not count; 0 means no idle end), so:
//  - while the merchant is active, a light call now and then keeps the server
//    session alive;
//  - after that long without any input, they are signed out here;
//  - a minute before, they are asked whether they are still there.
// The clock is timestamps, not a timeout, so a sleeping laptop or a throttled
// background tab still signs out on return. Returns { warning, stay, leave }:
// `warning` is the seconds left while the question is up, otherwise null.
export function useIdleSignOut() {
  const { t } = useTranslation();
  const signOut = useSignOut();
  const lastInput = useRef(Date.now());
  const [warning, setWarning] = useState(null);

  const idleSeconds = () => {
    const configured = readSessionPolicy()?.idle_timeout_seconds;
    return configured == null ? IDLE_SIGN_OUT_SECONDS : Number(configured);
  };

  // Any API call resets the server's clock; asking who the merchant is also
  // refreshes what the portal knows of them.
  const stay = useCallback(() => {
    lastInput.current = Date.now();
    setWarning(null);
    void loadMe().catch(() => {});
  }, []);
  const leave = useCallback(() => void signOut(), [signOut]);

  useEffect(() => {
    const touch = () => {
      lastInput.current = Date.now();
    };
    EVENTS.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    const timer = window.setInterval(() => {
      const idle = idleSeconds();
      if (!idle) return;
      const quiet = (Date.now() - lastInput.current) / 1000;
      // Active recently, but the server has heard nothing for a while: say hello.
      if (quiet < idle / 2 && (Date.now() - lastApiActivity()) / 1000 > idle / 2) void loadMe().catch(() => {});
      const warnAt = Math.max(idle - WARN_SECONDS, idle / 2);
      if (quiet >= idle) {
        window.clearInterval(timer);
        setWarning(null);
        // Says how long the limit really is (the server's number, not a fixed one).
        const minutes = Math.max(1, Math.round(idle / 60));
        notifications.info(
          t("auth.idleSignedOutFor", {
            count: minutes,
            defaultValue_one: "You were signed out after {{count}} minute without activity. Sign in again to continue.",
            defaultValue_other: "You were signed out after {{count}} minutes without activity. Sign in again to continue.",
          }),
        );
        void signOut();
      } else if (quiet >= warnAt) {
        setWarning(Math.ceil(idle - quiet));
      } else {
        setWarning((value) => (value == null ? value : null));
      }
    }, CHECK_MS);
    return () => {
      EVENTS.forEach((name) => window.removeEventListener(name, touch));
      window.clearInterval(timer);
    };
  }, [signOut, t]);
  return { warning, stay, leave };
}
