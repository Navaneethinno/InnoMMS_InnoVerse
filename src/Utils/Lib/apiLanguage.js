// Selected API response language — confirmed backend behavior: the
// `message` field in every response is translated per the requested locale
// via an `x-api-lang` request header; `remark` (internal diagnostic) always
// stays English regardless. English is the backend's own default, so the
// header is omitted entirely for it rather than sent as "en".
export const DEFAULT_API_LANGUAGE = "en";
const STORAGE_KEY = "apiLang";

export function getApiLanguage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_LANGUAGE;
  } catch {
    return DEFAULT_API_LANGUAGE;
  }
}

export function setApiLanguage(code) {
  const next = code || DEFAULT_API_LANGUAGE;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage can be unavailable (private mode, permissions) — the
    // selection just won't survive a reload in that case.
  }
}

// Spread into a request's headers.
export function apiLanguageHeader() {
  const lang = getApiLanguage();
  return lang && lang !== DEFAULT_API_LANGUAGE ? { "x-api-lang": lang } : {};
}
