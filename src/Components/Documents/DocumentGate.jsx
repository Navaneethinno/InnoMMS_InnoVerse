import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/Components/Common/Modal";
import Button from "@/Components/Common/Button";
import { useDocumentActions } from "@/Hooks/Documents/useDocumentActions";
import { forgetDocuments } from "@/Hooks/useDocuments";
import DocumentContent from "./DocumentContent";

// After every sign-in: the documents the user must accept and hasn't (a new
// one, or a new version of one accepted before) block the portal until they
// are accepted. What was accepted on the sign-up page is recorded first.
export default function DocumentGate({ onSignOut }) {
  const { takeConsent, acceptDocuments, listDocuments, getDocument } = useDocumentActions();
  const { t, i18n } = useTranslation();
  const [due, setDue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    const consented = takeConsent();
    if (consented.length) await acceptDocuments(consented).catch(() => {});
    forgetDocuments();
    const rows = await listDocuments().catch(() => []);
    const needed = rows.filter((d) => d.needs_acceptance);
    setDue(await Promise.all(needed.map((d) => getDocument(d.code).catch(() => d))));
  }, [acceptDocuments, getDocument, listDocuments, takeConsent]);
  useEffect(() => {
    void check();
  }, [check, i18n.language]);

  if (!due.length) return null;

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await acceptDocuments(due.map((d) => d.version_id));
      forgetDocuments();
      setDue([]);
    } catch (e) {
      // A newer version may have been published meanwhile: show that one.
      setError(e.message);
      await check();
    } finally {
      setBusy(false);
    }
  };
  const updated = due.some((d) => Number(d.accepted_version_no) > 0);

  return (
    <Modal open onOpenChange={() => {}} pending size="lg" title={updated ? t("docs.updatedTitle") : t("docs.acceptTitle")} description={updated ? t("docs.updatedBody") : t("docs.acceptBody")}>
      <div className="grid gap-5">
        {due.map((d) => (
          <section key={d.version_id}>
            <h3 className="mb-2 font-semibold text-ink">{d.title || d.name}</h3>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-4">
              {d.content != null ? <DocumentContent doc={d} /> : <p className="text-sm text-slate-500">{t("docs.unavailable")}</p>}
            </div>
          </section>
        ))}
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={onSignOut}>
          {t("docs.signOut")}
        </Button>
        <Button type="button" pending={busy} onClick={() => void accept()}>
          {t("docs.accept")}
        </Button>
      </div>
    </Modal>
  );
}
