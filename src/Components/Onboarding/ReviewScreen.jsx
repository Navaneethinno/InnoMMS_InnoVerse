import { useEffect, useRef, useState } from "react";
import { ArrowRight, BellRing, CircleAlert, CircleCheck, CircleX, Clock, RotateCcw, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/Utils/Lib/format";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FileUploadField from "@/Components/Common/FileUploadField";
import { cn } from "@/Utils/Lib/utils";
import OnboardingField from "./OnboardingField";

// What the merchant sees once the application is submitted: the outcome
// (`review.status`) and, when the institution asks for something, a form per
// open request (`review.requests`). A submitted application is locked; the
// only way to change anything is to answer a request.
//
//   FIELDS    change the fields named in target.fields
//   SECTION   answer the sections in target.sections again
//   DOCUMENT  upload a file (target.document says which)
//   QUESTION  a written answer
//
// The wording of the outcome belongs to the institution: `review.message`
// (for example the reason when not approved) is shown as the API sent it.

const OUTCOMES = {
  APPROVED: { icon: CircleCheck, tone: "bg-lime/40 text-on-secondary" },
  UNDER_REVIEW: { icon: Clock, tone: "bg-lime/40 text-on-secondary" },
  ACTION_REQUIRED: { icon: CircleAlert, tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  NOT_APPROVED: { icon: CircleX, tone: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" },
};

const sameValue = (a, b) => String(a) === String(b);
// The field keys a FIELDS request names (target.items, or the older flat list).
const fieldsOf = (target) => (target.items?.length ? target.items.map((item) => item.field) : (target.fields ?? []));
const dateText = (iso) => (iso ? formatDate(iso) : "");

// A dependent list shows only the choices that belong to its parent's answer.
const choicesOf = (field, row) => {
  const choices = field.choices ?? [];
  if (!field.parent_field) return choices;
  return choices.filter((c) => sameValue(c.parent, row?.[field.parent_field]));
};

// A section's fields as a form. `only` narrows it to the fields a FIELDS
// request names. Reports the draft upward as one value per section.
function SectionForm({ section, only, draft, setDraft, requestId, flow }) {
  const { t } = useTranslation();
  const fields = (section.fields ?? []).filter((f) => !only || only.includes(f.key));
  const multi = Boolean(section.multi_row);
  const rows = multi ? (Array.isArray(draft) ? draft : []) : [draft ?? {}];
  const setRow = (index, key, value) => {
    if (!multi) return setDraft({ ...(draft ?? {}), [key]: value });
    setDraft(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };
  return (
    <div className="grid grid-cols-1 gap-4">
      {!multi && (section.heading ?? section.label) && <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.heading ?? section.label}</p>}
      {rows.map((row, index) => (
        <div key={index} className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", multi && "rounded-2xl border border-slate-200 p-4")}>
          {fields.map((field) => (
            <OnboardingField
              key={field.key}
              field={field}
              value={row?.[field.key]}
              choices={choicesOf(field, row)}
              onChange={(value) => setRow(index, field.key, value)}
              file={
                field.field_type === "FILE"
                  ? {
                      ...flow.fileRulesFor(field),
                      // The path comes back as this field's answer in `data`.
                      upload: (file, side) => flow.uploadRequestFile({ requestId, field: field.key, side, file }),
                      download: flow.downloadFile,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ))}
      {multi && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft([...rows, {}])}
            className="rounded-xl border border-dashed border-ink/50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            {t("onb.addAnother")}
          </button>
          {rows.length > 0 && (
            <button type="button" onClick={() => setDraft(rows.slice(0, -1))} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
              {t("onb.removeLast")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, flow }) {
  const { t } = useTranslation();
  const { kind, target = {} } = request;
  const open = request.status === "OPEN";
  const [sections, setSections] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState([]);
  const stepKeys = useRef((flow.wizard?.progress?.steps ?? []).map((step) => step.key));

  // FIELDS / SECTION requests redraw the form from the sections they reopen.
  useEffect(() => {
    if (!open || (kind !== "FIELDS" && kind !== "SECTION")) return undefined;
    let cancelled = false;
    // FIELDS lists every field with its section (target.items); older replies
    // only had the flat list, so the sections come from the progress steps.
    const itemSections = [...new Set((target.items ?? []).map((item) => item.section))];
    const keys = kind === "SECTION" ? (target.sections ?? []) : itemSections.length ? itemSections : stepKeys.current;
    if (!keys.length) {
      setLoadFailed(true);
      return undefined;
    }
    Promise.all(keys.map((key) => flow.loadRequestSection(key).catch(() => null)))
      .then((loaded) => {
        if (cancelled) return;
        const asked = fieldsOf(target);
        const wanted = loaded.filter(Boolean).filter((section) => kind === "SECTION" || (section.fields ?? []).some((f) => asked.includes(f.key)));
        if (!wanted.length) {
          setLoadFailed(true);
          return;
        }
        setSections(wanted);
        setDrafts(Object.fromEntries(wanted.map((section) => [section.key, section.values ?? (section.multi_row ? [] : {})])));
      })
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
    // The request is fixed for the card's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = () => {
    if (kind === "QUESTION") return flow.respondToRequest(request.id, { answer: answer.trim() });
    if (kind === "DOCUMENT") return flow.respondToRequest(request.id, { files });
    const only = kind === "FIELDS" ? fieldsOf(target) : null;
    const pick = (row) => (only ? Object.fromEntries(Object.entries(row ?? {}).filter(([key]) => only.includes(key))) : row);
    // FIELDS: one object per section, always. SECTION: the whole section as
    // `next` takes it (a list of rows when it has several).
    const data = Object.fromEntries(
      (sections ?? []).map((section) => {
        const draft = drafts[section.key];
        if (kind === "FIELDS") return [section.key, pick(Array.isArray(draft) ? draft[0] : draft)];
        return [section.key, Array.isArray(draft) ? draft.map(pick) : pick(draft)];
      }),
    );
    return flow.respondToRequest(request.id, { data });
  };
  const ready = kind === "QUESTION" ? answer.trim() : kind === "DOCUMENT" ? files.length > 0 : Boolean(sections);

  return (
    <li className="rounded-2xl border border-slate-200 bg-surface p-5 text-left shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{request.message}</p>
        {open && request.due_at && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", request.overdue ? "bg-red-500/15 text-red-600 dark:text-red-300" : "bg-ink/10 text-ink")}>
            {request.overdue ? `${t("onb.overdue")} · ` : `${t("onb.due")} `}
            {dateText(request.due_at)}
          </span>
        )}
      </div>
      {!open ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Send size={12} /> {request.responded_at ? t("onb.sentOn", { date: dateText(request.responded_at) }) : t("onb.sentWaiting")}
        </p>
      ) : (
        <div className="mt-4">
          {kind === "QUESTION" && (
            <textarea
              rows={4}
              maxLength={4000}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label={t("onb.answerLabel")}
              placeholder={t("onb.answerPlaceholder")}
              className="field-control w-full border-ink/25 focus:border-ink"
            />
          )}
          {kind === "DOCUMENT" && (
            <div>
              {target.document && <p className="mb-1.5 text-xs font-semibold text-slate-600">{target.document}</p>}
              {/* Every file is stored on its own; all the paths go in one answer. */}
              <div className="grid gap-3">
                {[...files, ""].map((path, index) => (
                  <FileUploadField
                    key={path || `new-${files.length}`}
                    value={path}
                    onChange={(next) => setFiles((previous) => (next ? [...previous.slice(0, index), next, ...previous.slice(index + 1)] : previous.filter((_, i) => i !== index)))}
                    upload={(file) => flow.uploadRequestFile({ requestId: request.id, file })}
                    download={flow.downloadFile}
                    formats={["pdf", "jpeg", "png"]}
                    maxBytes={10 * 1024 * 1024}
                  />
                ))}
              </div>
            </div>
          )}
          {(kind === "FIELDS" || kind === "SECTION") &&
            (loadFailed ? (
              <p className="text-sm text-red-600">{t("common.requestFailed")}</p>
            ) : !sections ? (
              <div className="h-24 animate-pulse rounded-xl bg-slate-200/60" />
            ) : (
              <div className="grid gap-6">
                {sections.map((section) => (
                  <SectionForm
                    key={section.key}
                    section={section}
                    only={kind === "FIELDS" ? fieldsOf(target) : null}
                    draft={drafts[section.key]}
                    setDraft={(value) => setDrafts((prev) => ({ ...prev, [section.key]: value }))}
                    requestId={request.id}
                    flow={flow}
                  />
                ))}
              </div>
            ))}
          <Button type="button" pending={flow.responding} disabled={!ready} onClick={() => void send()} className="mt-5 px-6">
            {t("onb.send")}
            {!flow.responding && <Send size={15} />}
          </Button>
        </div>
      )}
    </li>
  );
}

export default function ReviewScreen({ flow, onSubmitted }) {
  const { t } = useTranslation();
  const { review, wizard, completedMessage, problemInfo } = flow;
  const outcome = OUTCOMES[review?.status] ?? OUTCOMES.APPROVED;
  const Icon = outcome.icon;
  const requests = review?.requests ?? [];
  // Open requests first; the ones already answered wait for the institution.
  const ordered = [...requests.filter((r) => r.status === "OPEN"), ...requests.filter((r) => r.status !== "OPEN")];
  const body =
    review?.status === "NOT_APPROVED" ? review.message : review?.status === "APPROVED" ? completedMessage || wizard.onboarding?.status_name || t("onb.outcome.APPROVED.body") : t(`onb.outcome.${review?.status}.body`, { defaultValue: "" });

  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <span className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", outcome.tone)}>
        <Icon size={34} strokeWidth={1.8} />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">{t(`onb.outcome.${review?.status in OUTCOMES ? review.status : "APPROVED"}.title`)}</h1>
      {body && <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{body}</p>}
      {review?.status === "UNDER_REVIEW" && (
        <p className="mx-auto mt-5 flex max-w-sm items-start gap-2.5 rounded-2xl border border-ink/15 bg-surface p-4 text-left text-sm leading-6 text-slate-600">
          <BellRing size={18} className="mt-0.5 shrink-0 text-ink" />
          <span>{t("onb.reviewNote")}</span>
        </p>
      )}
      {problemInfo && (
        <div className="mt-6 text-left">
          <ErrorState message={problemInfo.message} problems={problemInfo.problems} />
        </div>
      )}
      {ordered.length > 0 && (
        <ul className="mt-8 grid gap-4">
          {ordered.map((request) => (
            <RequestCard key={request.id} request={request} flow={flow} />
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onSubmitted && (
          <Button type="button" onClick={onSubmitted} className="px-8">
            {t("signup.backToSignIn")}
            <ArrowRight size={16} />
          </Button>
        )}
        {/* Back to the picker, to look up another contact or start again. */}
        <Button type="button" variant="secondary" onClick={flow.startOver} className="px-6">
          <RotateCcw size={15} />
          {t("review.startOver")}
        </Button>
      </div>
    </div>
  );
}
