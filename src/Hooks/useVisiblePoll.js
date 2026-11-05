import { useEffect, useRef } from "react";

// Calls `read` every `every` ms, only while the browser tab is visible, and
// never while the last call is still waiting. Returns the stop function.
export function startVisiblePoll(read, every) {
  let waiting = false;
  const timer = setInterval(() => {
    if (waiting || document.visibilityState !== "visible") return;
    waiting = true;
    Promise.resolve(read()).finally(() => {
      waiting = false;
    });
  }, every);
  return () => clearInterval(timer);
}

// startVisiblePoll while `enabled`. `read` returns a promise; the first call is
// the caller's.
export function useVisiblePoll(read, every, enabled = true) {
  const latest = useRef(read);
  useEffect(() => {
    latest.current = read;
  });
  useEffect(() => {
    if (!enabled) return undefined;
    return startVisiblePoll(() => latest.current(), every);
  }, [every, enabled]);
}
