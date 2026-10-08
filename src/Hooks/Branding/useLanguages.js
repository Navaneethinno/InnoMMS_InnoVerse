import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadLanguages } from "@/Services/Language/language.api";

// Each language's own name, for the picker (the API names them in English); a
// language not listed here shows the API's name.
const NATIVE = { en: "English", pt: "Português", fr: "Français", hi: "हिन्दी", ar: "العربية" };

let cached = null;

// The languages to offer: every one the platform lists. A language the portal
// has no texts for yet shows the portal in English, with the API's messages in
// that language. If the list cannot be had, the portal's own languages.
export function useLanguages() {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    loadLanguages()
      .then((list) => {
        cached = list.filter((row) => row?.code).map((row) => ({ code: row.code, name: row.name }));
        if (!cancelled) setRows(cached);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const own = Object.keys(i18n.options.resources ?? {}).map((code) => ({ code, name: code }));
  const list = rows?.length ? rows : own;
  return list.map(({ code, name }) => ({ value: code, label: NATIVE[code] ?? name }));
}
