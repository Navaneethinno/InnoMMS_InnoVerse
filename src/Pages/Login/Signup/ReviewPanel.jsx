import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileUp, Send, XCircle } from "lucide-react";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications } from "@/Utils/Lib/notifications";
import { OnboardingField, fieldControl } from "./OnboardingField";

const button = "inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60";
const sectionKeyOf = (request) => request.target?.section_key ?? request.target?.section ?? request.target?.sections?.[0] ?? request.target?.fields?.find((field) => typeof field === "object")?.section_key;
const fieldKeysOf = (request) => new Set((request.target?.fields ?? []).map((field) => typeof field === "string" ? field : field.key));

function RequestCard({ request, flow }) {
  const [section, setSection] = useState(null);
  const [draft, setDraft] = useState(null);
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const sectionKey = sectionKeyOf(request);
  const allowedFields = useMemo(() => fieldKeysOf(request), [request]);
  const open = request.status === "OPEN";
  useEffect(() => {
    if (!open || !["FIELDS", "SECTION"].includes(request.kind) || !sectionKey) return;
    setLoading(true);
    flow.loadReviewSection(sectionKey).then((next) => {
      setSection(next);
      setDraft(next?.multi_row ? (next.values?.length ? next.values : [{}]) : (next?.values ?? {}));
    }).catch((error) => notifications.error(error.message)).finally(() => setLoading(false));
  // Loading is keyed by the request; flow callbacks are recreated with the hook.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.id, request.kind, sectionKey]);
  const visibleFields = (section?.fields ?? []).filter((field) => request.kind !== "FIELDS" || allowedFields.has(field.key));
  const change = (rowIndex, key, value) => setDraft((current) => rowIndex === undefined ? { ...(current ?? {}), [key]: value } : current.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row));
  const send = async () => {
    if (request.kind === "QUESTION") return flow.respond(request.id, { answer });
    if (request.kind === "DOCUMENT") return flow.respond(request.id, { files });
    if (!sectionKey) return notifications.error("The request does not identify which section to reopen.");
    const data = request.kind === "FIELDS"
      ? (Array.isArray(draft) ? draft.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => allowedFields.has(key)))) : Object.fromEntries(Object.entries(draft ?? {}).filter(([key]) => allowedFields.has(key))))
      : draft;
    return flow.respond(request.id, { data: { [sectionKey]: data } });
  };
  const uploadDocument = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return notifications.error("The file must be under 10 MB.");
    setLoading(true);
    try { const path = await flow.respondUpload(request.id, file); setFiles((current) => [...current, typeof path === "string" ? path : path?.path]); }
    catch (error) { notifications.error(error.message); }
    finally { setLoading(false); }
  };
  return (
    <article className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{request.kind}</p><p className="mt-1 text-sm text-foreground">{request.message}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{open ? "Action required" : "Sent — awaiting review"}</span></div>
      {request.due_at && <p className={`text-xs ${request.overdue ? "text-red-600" : "text-muted-foreground"}`}>Due {new Date(request.due_at).toLocaleString()}</p>}
      {open && request.kind === "QUESTION" && <textarea className={`${fieldControl} min-h-28`} maxLength={4000} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write your answer" />}
      {open && request.kind === "DOCUMENT" && <div><input id={`review-file-${request.id}`} type="file" className="hidden" accept="image/png,image/jpeg,application/pdf" onChange={(event) => void uploadDocument(event.target.files?.[0])} /><label htmlFor={`review-file-${request.id}`} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary/50 px-3 py-2 text-sm font-semibold text-primary"><FileUp size={15} />Upload document</label>{files.map((path) => <p key={path} className="mt-2 truncate text-xs text-muted-foreground">{path}</p>)}</div>}
      {open && ["FIELDS", "SECTION"].includes(request.kind) && (loading ? <Spinner size={18} /> : section ? <div className="space-y-4">{(Array.isArray(draft) ? draft : [draft ?? {}]).map((row, rowIndex) => <div key={rowIndex} className="grid gap-4 sm:grid-cols-2">{visibleFields.map((field) => <OnboardingField key={field.key} field={field} value={row?.[field.key]} options={flow.optionsFor(field, row)} onChange={(value) => change(section.multi_row ? rowIndex : undefined, field.key, value)} file={field.field_type === "FILE" ? { upload: (file, side) => flow.respondUpload(request.id, file, field.key, side), download: flow.downloadFile } : undefined} />)}</div>)}</div> : <p className="text-sm text-red-600">This request does not identify a section that can be opened.</p>)}
      {open && <button type="button" className={button} disabled={flow.busy === "respond" || loading || (request.kind === "DOCUMENT" && !files.length) || (request.kind === "QUESTION" && !answer.trim())} onClick={() => void send()}>{flow.busy === "respond" ? <Spinner size={14} /> : <Send size={14} />}Send response</button>}
    </article>
  );
}

export function ReviewPanel({ flow, onDone }) {
  const review = flow.screen?.review;
  const status = review?.status;
  const icon = status === "APPROVED" ? <CheckCircle2 size={40} className="text-emerald-500" /> : status === "NOT_APPROVED" ? <XCircle size={40} className="text-red-500" /> : <Clock3 size={40} className="text-amber-500" />;
  const title = status === "APPROVED" ? "Approved" : status === "NOT_APPROVED" ? "Not approved" : status === "ACTION_REQUIRED" ? "Action required" : "Your application is under review";
  return <div className="space-y-5"><div className="rounded-2xl border border-border bg-muted/30 p-5">{icon}<h2 className="mt-3 text-xl font-bold text-foreground">{title}</h2>{review?.message && <p className="mt-2 text-sm text-muted-foreground">{review.message}</p>}{flow.completedMessage && <p className="mt-2 text-sm text-muted-foreground">{flow.completedMessage}</p>}</div>{review?.requests?.map((request) => <RequestCard key={request.id} request={request} flow={flow} />)}{status === "APPROVED" && <button type="button" className={button} onClick={onDone}>Continue to sign in</button>}</div>;
}
