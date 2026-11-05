import { STORAGE_KEYS } from "@/Utils/Constant";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import { setApiLanguage } from "@/Utils/Lib/apiLanguage";
let language = "en";
try {
  language = localStorage.getItem(STORAGE_KEYS.language) || "en";
} catch {
  /* Default locale. */
}
i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    lng: language,
    fallbackLng: "en",
    keySeparator: false,
    // `brand` is the bank's display name from the branding API (see
    // Utils/Lib/branding.js); this is the name until that arrives.
    interpolation: { escapeValue: false, defaultVariables: { brand: "InnoVerse" } },
  });
// {{brand, uppercase}} for the eyebrows that are written in capitals.
i18n.services.formatter?.add("uppercase", (value) => String(value).toUpperCase());
// Arabic (and any other right-to-left language) mirrors the whole layout.
const applyDirection = (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = i18n.dir(lng);
};
applyDirection(i18n.language || "en");
// The API translates its messages by the x-api-lang header, so it always
// follows the app language.
setApiLanguage(i18n.language || "en");
i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
  setApiLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEYS.language, lng);
  } catch {
    /* Locale still updates in memory. */
  }
});

// Other languages load when first used, so nobody downloads all of them.
const OTHERS = { pt: () => import("./locales/pt"), ar: () => import("./locales/ar") };
export async function loadLanguage(lng) {
  const code = String(lng ?? "").split("-")[0];
  if (!OTHERS[code] || i18n.hasResourceBundle(code, "translation")) return;
  const { default: bundle } = await OTHERS[code]();
  i18n.addResourceBundle(code, "translation", bundle, true, true);
}
const switchLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng, callback) => {
  await loadLanguage(lng);
  return switchLanguage(lng, callback);
};

export default i18n;
