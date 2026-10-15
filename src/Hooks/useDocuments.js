import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listDocuments } from "@/Services/Documents/documents.api";
import { getStoredAccessToken } from "@/Services/api/authStorage";

// The published documents, shared by the footer, the sign-in page and the
// sign-up page: one call per language and sign-in state. null while loading;
// [] when there are none or the call failed (the pages then fall back to the
// portal's own legal pages).
let cached = null;

export function forgetDocuments() {
  cached = null;
}

export function useDocuments() {
  const { i18n } = useTranslation();
  const signedIn = Boolean(getStoredAccessToken());
  const [docs, setDocs] = useState(null);
  useEffect(() => {
    const key = `${signedIn}|${i18n.language}`;
    if (cached?.key !== key) cached = { key, promise: listDocuments().catch(() => []) };
    let live = true;
    cached.promise.then((rows) => live && setDocs(rows));
    return () => {
      live = false;
    };
  }, [signedIn, i18n.language]);
  return docs;
}
