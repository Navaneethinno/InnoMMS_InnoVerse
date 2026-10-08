import { STORAGE_KEYS } from "@/Utils/Constant";

// Light/dark theme: a `dark` class on <html> switches the colour variables
// in styles.css. The merchant's choice is remembered; until they choose,
// the system setting is followed.
export function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.theme);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function storeTheme(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* The choice just won't be remembered. */
  }
}

// Applied before the first render so the page never flashes the wrong theme.
export function initTheme() {
  applyTheme(readStoredTheme() ?? systemTheme());
}
