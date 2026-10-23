import { useSyncExternalStore } from "react";

// Which platform the API runs as: every reply carries `X-Environment` (UAT or
// PRODUCTION). The first reply after the page loads decides it for the
// session. Only an explicit UAT counts; a missing header is never taken as UAT.
let environment = null;
let decided = false;
let brandTitle = document.title;
const listeners = new Set();

const applyTitle = () => {
  document.title = environment === "UAT" ? `[UAT] ${brandTitle}` : brandTitle;
};

// Called with a reply's headers (axios headers or fetch `Headers`).
export function noteEnvironment(headers) {
  if (decided || !headers) return;
  decided = true;
  const value =
    typeof headers.get === "function"
      ? headers.get("x-environment")
      : headers["x-environment"];
  environment =
    String(value ?? "")
      .trim()
      .toUpperCase() === "UAT"
      ? "UAT"
      : null;
  applyTitle();
  listeners.forEach((listener) => listener());
}

// The browser tab's title: the bank's name, marked in UAT so testers can tell
// tabs apart.
export function setTabTitle(title) {
  brandTitle = title;
  applyTitle();
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const useEnvironment = () =>
  useSyncExternalStore(subscribe, () => environment);
