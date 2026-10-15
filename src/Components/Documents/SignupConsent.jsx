import { useEffect, useMemo, useState } from "react";
import { Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { useDocuments } from "@/Hooks/useDocuments";

// The sign-up page's "I accept ..." boxes: one per document the institution
// requires. onChange({ ok, ids }): ok once every box is ticked (or nothing is
// required), ids the versions accepted, recorded after the first sign-in.
export default function SignupConsent({ onChange }) {
  const docs = useDocuments();
  const required = useMemo(() => (docs ?? []).filter((d) => d.requires_acceptance), [docs]);
  const [ticked, setTicked] = useState({});
  useEffect(() => {
    onChange({ ok: docs !== null && required.every((d) => ticked[d.version_id]), ids: required.map((d) => d.version_id) });
  }, [docs, required, ticked, onChange]);
  if (!required.length) return null;
  return (
    <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
      {required.map((d) => (
        <li key={d.version_id}>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-ink" checked={Boolean(ticked[d.version_id])} onChange={(e) => setTicked((prev) => ({ ...prev, [d.version_id]: e.target.checked }))} />
            <span>
              <Trans i18nKey="docs.iAccept" values={{ name: d.title || d.name }} components={{ doc: <Link to={`/legal/${encodeURIComponent(d.code)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline" /> }} />
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
