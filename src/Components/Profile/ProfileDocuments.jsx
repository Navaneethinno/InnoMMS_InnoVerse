import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileImage } from "lucide-react";
import Modal from "@/Components/Common/Modal";
import Spinner from "@/Components/Common/Spinner";
import { loadProfileFile } from "@/Services/Profile/profile.api";

// One document from sign-up: loaded as an image, shown as a thumbnail, and
// larger when clicked.
function Document({ item }) {
  const { t } = useTranslation();
  const [state, setState] = useState({ url: "", failed: false });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    let made = "";
    loadProfileFile(item.path)
      .then(({ blob }) => {
        made = URL.createObjectURL(blob);
        if (live) setState({ url: made, failed: false });
      })
      .catch(() => live && setState({ url: "", failed: true }));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [item.path]);

  return (
    <li>
      <button
        type="button"
        disabled={!state.url}
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:border-ink/40 disabled:cursor-default"
      >
        <span className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100">
          {state.url ? <img src={state.url} alt={item.label} className="h-full w-full object-cover" /> : state.failed ? <FileImage size={28} className="text-slate-400" aria-hidden="true" /> : <Spinner />}
        </span>
        <span className="block px-3 py-2 text-sm font-semibold text-slate-700">{item.label}</span>
      </button>
      {state.failed && <p className="mt-1 text-xs text-slate-500">{t("profile.documentFailed", { defaultValue: "This document could not be opened." })}</p>}
      <Modal open={open} onOpenChange={setOpen} size="lg" title={item.label}>
        {state.url && <img src={state.url} alt={item.label} className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-xl" />}
      </Modal>
    </li>
  );
}

// The ID photos and selfie the customer gave at sign-up (read-only).
export default function ProfileDocuments({ documents }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {documents.map((item) => (
        <Document key={item.path} item={item} />
      ))}
    </ul>
  );
}
