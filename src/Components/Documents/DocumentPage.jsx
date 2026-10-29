import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthCard from "@/Components/Auth/AuthCard";
import { useDocumentActions } from "@/Hooks/Documents/useDocumentActions";
import DocumentContent from "./DocumentContent";

// /legal/:code: one of the institution's documents, opened from the footer,
// the sign-in page or the sign-up page (in a new tab).
export default function DocumentPage() {
  const { getDocument } = useDocumentActions();
  const { code } = useParams();
  const { t, i18n } = useTranslation();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    getDocument(code)
      .then((d) => live && setDoc(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [code, getDocument, i18n.language]);

  if (error) return <AuthCard title={t("docs.unavailable")} description={error} />;
  if (!doc) return <AuthCard title={t("docs.loading")} />;
  const date = doc.published_at ? new Date(doc.published_at).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <AuthCard wide title={doc.title || doc.name} description={doc.description || undefined}>
      <p className="-mt-3 mb-5 text-xs text-slate-400">{t("docs.versionOn", { n: doc.version_no, date })}</p>
      <DocumentContent doc={doc} />
    </AuthCard>
  );
}
