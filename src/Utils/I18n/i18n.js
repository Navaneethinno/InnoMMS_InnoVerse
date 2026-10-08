import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import pt from "./locales/pt";
import { setApiLanguage } from "@/Utils/Lib/apiLanguage";
let language = "en";
try {
  language = localStorage.getItem("innoverse-merchant:language") || "en";
} catch {
  /* Default locale. */
}
i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, pt: { translation: pt } },
    lng: language,
    fallbackLng: "en",
    keySeparator: false,
    // `brand` is the bank's display name from the branding API (see
    // Utils/Lib/branding.js); this is the name until that arrives.
    interpolation: { escapeValue: false, defaultVariables: { brand: "InnoVerse" } },
  });
// {{brand, uppercase}} for the eyebrows that are written in capitals.
i18n.services.formatter?.add("uppercase", (value) => String(value).toUpperCase());
document.documentElement.lang = i18n.language || "en";
// The API translates its messages by the x-api-lang header, so it always
// follows the app language.
setApiLanguage(i18n.language || "en");
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  setApiLanguage(lng);
  try {
    localStorage.setItem("innoverse-merchant:language", lng);
  } catch {
    /* Locale still updates in memory. */
  }
});
export default i18n;
