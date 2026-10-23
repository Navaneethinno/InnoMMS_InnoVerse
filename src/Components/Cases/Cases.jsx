import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ArrowLeft, FileImage, FileText, Lock, MessageSquarePlus, MessagesSquare, Paperclip, Send, Undo2, X } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import Modal from "@/Components/Common/Modal";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import Spinner from "@/Components/Common/Spinner";
import { useMediaQuery, WIDE_QUERY } from "@/Hooks/Layout/useMediaQuery";
import { countCases, downloadCaseFile, getCase, listCaseCategories, listCases, openCase, replyToCase, uploadCaseFile, withdrawCase } from "@/Services/Cases/cases.api";
import { useCaseChanged } from "@/Services/api/liveUpdates";
import { userUpdated } from "@/Redux/slices/authSlice";
import { formatDateTime, formatShortDate } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

const LIMIT = 20;
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_TITLE = 200;
const MAX_BODY = 4000;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const STATE_TONE = {
  ACTION_NEEDED: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  CLOSED: "bg-ink/5 text-slate-500",
};
const fieldClass = "field-control w-full";

function StatePill({ state }) {
  const { t } = useTranslation();
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATE_TONE[state] ?? STATE_TONE.CLOSED)}>{t(`cases.state.${state}`, { defaultValue: state })}</span>;
}

// A support case's category (empty on a case the bank opened).
function CategoryTag({ code, labels }) {
  if (!code) return null;
  return <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{labels[code] ?? code}</span>;
}

// The case categories in the portal's language, as { code: label }.
function useCategories() {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    listCaseCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [i18n.language]);
  return categories;
}

// Files picked for a post: each uploads at once (PDF, JPG or PNG, 5 MB, at
// most 5) and is sent back as { path, name } so it keeps its own name.
function useCaseFiles() {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]); // [{ key, name, path?, uploading, error? }]
  const pick = async (list) => {
    const room = MAX_FILES - files.length;
    if (list.length > room) toast.error(t("cases.tooManyFiles", { max: MAX_FILES }));
    for (const file of [...list].slice(0, Math.max(0, room))) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_BYTES) {
        setFiles((all) => [...all, { key, name: file.name, error: t("cases.fileTooBig") }]);
        continue;
      }
      setFiles((all) => [...all, { key, name: file.name, uploading: true }]);
      try {
        const stored = await uploadCaseFile(file);
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, path: stored.path, name: stored.name ?? f.name } : f)));
      } catch (failure) {
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, error: failure.message } : f)));
      }
    }
  };
  return {
    files,
    pick,
    remove: (key) => setFiles((all) => all.filter((f) => f.key !== key)),
    clear: () => setFiles([]),
    ready: files.filter((f) => f.path).map(({ path, name }) => ({ path, name })),
    uploading: files.some((f) => f.uploading),
    full: files.length >= MAX_FILES,
  };
}

// The picked files as chips (spinner while uploading, the reason if refused).
function FileChips({ picker }) {
  const { t } = useTranslation();
  if (!picker.files.length) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-1.5">
      {picker.files.map((f) => (
        <li key={f.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs", f.error ? "border-red-300 text-red-600" : "border-slate-200")}>
          {f.uploading ? <Spinner className="h-3 w-3" /> : <Paperclip size={12} />}
          <span className="max-w-40 truncate">{f.name}</span>
          {f.error && <span className="text-[10px]">· {f.error}</span>}
          <button type="button" aria-label={t("cases.removeFile")} onClick={() => picker.remove(f.key)} className="rounded p-0.5 hover:bg-ink/5">
            <X size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
}

// The paperclip and its hidden file input.
function AttachButton({ picker, disabled, className }) {
  const { t } = useTranslation();
  const input = useRef(null);
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={picker.full || disabled}
        aria-label={t("cases.attach")}
        title={t("cases.attachHint", { max: MAX_FILES })}
        className={cn("rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:text-ink disabled:opacity-40", className)}
      >
        <Paperclip size={18} />
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          void picker.pick(event.target.files ?? []);
          event.target.value = "";
        }}
      />
    </>
  );
}

// A file of a post: opened in a new tab (it comes from the API with the
// merchant's own sign-in, so it is fetched, then shown).
function Attachment({ file, mine }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const image = /\.(jpe?g|png)$/i.test(file.name ?? file.path ?? "");
  const Icon = image ? FileImage : FileText;
  const open = async () => {
    setBusy(true);
    const tab = window.open("", "_blank");
    try {
      const blob = await downloadCaseFile(file.path);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      tab?.close();
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={() => void open()}
      title={t("cases.openFile")}
      className={cn("flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-start text-xs font-semibold transition", mine ? "border-white/30 bg-white/10 hover:bg-white/20" : "border-slate-200 bg-surface hover:border-forest/40")}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon size={15} className="shrink-0" />}
      <span className="truncate">{file.name || t("cases.file")}</span>
    </button>
  );
}

// Open a support case: a category, a subject, a message and files.
function NewCaseForm({ categories, onClose, onOpened }) {
  const { t } = useTranslation();
  const picker = useCaseFiles();
  const [form, setForm] = useState({ category: "", title: "", body: "" });
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((previous) => ({ ...previous, [key]: value }));
  const ready = form.category && form.title.trim() && form.body.trim() && !picker.uploading;
  const submit = async () => {
    setSaving(true);
    try {
      const kase = await openCase({ category: form.category, title: form.title.trim(), body: form.body.trim(), files: picker.ready });
      toast.success(t("cases.opened"));
      onOpened(kase);
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={saving} size="lg" title={t("cases.newTitle")} description={t("cases.newHint")}>
      <div className="grid gap-4">
        <FilterSelect label={t("cases.category")} placeholder={t("cases.pickCategory")} value={form.category} onChange={set("category")} options={categories.map((c) => ({ value: c.code, label: c.label }))} />
        <label className="block text-sm font-medium">
          {t("cases.subject")}
          <input dir="auto" value={form.title} maxLength={MAX_TITLE} onChange={(event) => set("title")(event.target.value)} placeholder={t("cases.subjectPlaceholder")} className={cn(fieldClass, "mt-2")} />
        </label>
        <label className="block text-sm font-medium">
          {t("cases.message")}
          <textarea dir="auto" value={form.body} maxLength={MAX_BODY} rows={5} onChange={(event) => set("body")(event.target.value)} placeholder={t("cases.messagePlaceholder")} className={cn(fieldClass, "mt-2 min-h-[7rem] resize-y")} />
          <span className="mt-1 block text-end text-[11px] font-normal text-slate-400">
            {form.body.length}/{MAX_BODY}
          </span>
        </label>
        <div>
          <FileChips picker={picker} />
          <div className="flex items-center gap-3">
            <AttachButton picker={picker} disabled={saving} />
            <span className="text-[11px] text-slate-400">{t("cases.attachHint", { max: MAX_FILES })}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button pending={saving} disabled={!ready} onClick={() => void submit()}>
            <Send size={16} /> {t("cases.openCase")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Withdraw a case the merchant opened: an optional reason, for staff only.
function WithdrawDialog({ onClose, onDone, id }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const withdraw = async () => {
    setSaving(true);
    try {
      onDone(await withdrawCase({ id, reason: reason.trim() }));
      toast.success(t("cases.withdrawn"));
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={saving} title={t("cases.withdrawTitle")} description={t("cases.withdrawHint")}>
      <label className="block text-sm font-medium">
        {t("cases.withdrawReason")}
        <textarea dir="auto" value={reason} maxLength={MAX_BODY} rows={3} onChange={(event) => setReason(event.target.value)} className={cn(fieldClass, "mt-2 resize-y")} />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {t("common.cancel", { defaultValue: "Cancel" })}
        </Button>
        <Button pending={saving} onClick={() => void withdraw()}>
          {t("cases.withdraw")}
        </Button>
      </div>
    </Modal>
  );
}

// One case: its posts as a conversation (staff on the left, the merchant on
// the right) and, while it is open, a reply box with up to 5 files. A case
// the merchant opened can be withdrawn while open.
function Thread({ id, labels, onBack, onChanged }) {
  const { t } = useTranslation();
  const [kase, setKase] = useState(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const picker = useCaseFiles();
  const end = useRef(null);

  const load = useCallback(async () => {
    try {
      setKase(await getCase(id));
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  // A change on this case: a new post, or the case itself (from any device).
  useCaseChanged((changes) => changes.some((c) => String(c.case_id) === String(id)) && void load());
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [kase?.posts?.length]);

  const send = async () => {
    if (!body.trim() && !picker.ready.length) return;
    setSending(true);
    try {
      setKase(await replyToCase({ id, body: body.trim(), files: picker.ready }));
      setBody("");
      picker.clear();
      onChanged?.();
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSending(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!kase) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-col">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        {onBack && (
          <button type="button" onClick={onBack} aria-label={t("cases.back")} className="-ms-1 rounded-lg p-1.5 text-slate-500 hover:bg-ink/5">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p dir="auto" className="font-bold text-ink">{kase.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>
              {kase.case_number} · {t("cases.openedOn", { date: formatShortDate(kase.opened_at) })}
            </span>
            <CategoryTag code={kase.category} labels={labels} />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatePill state={kase.state} />
          {kase.can_withdraw && (
            <button type="button" onClick={() => setWithdrawing(true)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600">
              <Undo2 size={13} /> {t("cases.withdraw")}
            </button>
          )}
        </div>
      </div>

      <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {(kase.posts ?? []).map((post) => {
          const mine = post.from === "ME";
          return (
            <li key={post.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", mine ? "rounded-ee-md bg-forest text-white dark:bg-lime dark:text-on-secondary" : "rounded-es-md border border-slate-200 bg-paper text-ink")}>
                {!mine && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{t("brand.name")}</p>}
                {post.body && <p dir="auto" className="whitespace-pre-wrap break-words">{post.body}</p>}
                {post.files?.length > 0 && (
                  <div className={cn("grid gap-1.5", post.body && "mt-2")}>
                    {post.files.map((file) => (
                      <Attachment key={file.path} file={file} mine={mine} />
                    ))}
                  </div>
                )}
                <p className={cn("mt-1 text-end text-[10px]", mine ? "text-white/70 dark:text-on-secondary/70" : "text-slate-400")}>{formatDateTime(post.at)}</p>
              </div>
            </li>
          );
        })}
        <li ref={end} aria-hidden="true" />
      </ol>

      {kase.can_reply ? (
        <div className="border-t border-slate-100 p-3">
          <FileChips picker={picker} />
          <div className="flex items-end gap-2">
            <AttachButton picker={picker} disabled={sending} />
            <textarea
              dir="auto"
              value={body}
              maxLength={MAX_BODY}
              rows={2}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("cases.replyPlaceholder")}
              className="min-h-[3rem] flex-1 resize-none rounded-xl border border-slate-200 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
            <Button pending={sending} disabled={picker.uploading || (!body.trim() && !picker.ready.length)} onClick={() => void send()} className="h-12 px-4 py-0" aria-label={t("cases.send")}>
              <Send size={17} />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">{t("cases.attachHint", { max: MAX_FILES })}</p>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t border-slate-100 p-4 text-xs font-semibold text-slate-500">
          <Lock size={13} /> {t("cases.closedNote")}
        </p>
      )}
      {withdrawing && (
        <WithdrawDialog
          id={id}
          onClose={() => setWithdrawing(false)}
          onDone={(next) => {
            setKase(next);
            setWithdrawing(false);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

// The merchant's cases: ones the bank opened (staff's internal notes are
// never shown) and questions or complaints the merchant opened, each a
// conversation. Cases waiting for the merchant come first; a badge in the
// menu counts them. On a wide screen the list and the open case sit side by
// side; on a narrow one, one at a time.
export default function Cases() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const wide = useMediaQuery(WIDE_QUERY);
  const categories = useCategories();
  const labels = Object.fromEntries(categories.map((c) => [c.code, c.label]));
  const [tab, setTab] = useState("OPEN");
  const [pages, setPages] = useState(1);
  const [state, setState] = useState({ loading: true, cases: [], total: 0, error: "" });
  const [count, setCount] = useState({ support_open: 0, support_limit: 5 });
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const [reply, counted] = await Promise.all([listCases({ state: tab === "ALL" ? "" : tab, page: 1, limit: LIMIT * pages }), countCases().catch(() => null)]);
        setState({ loading: false, cases: reply.cases ?? [], total: reply.total ?? 0, error: "" });
        if (counted) setCount(counted);
        dispatch(userUpdated({ casesAction: counted?.action_needed ?? reply.action_needed ?? 0 }));
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [tab, pages, dispatch],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useCaseChanged(() => void load(true));

  // Up to `support_limit` support cases may be open at once.
  const atLimit = (count.support_open ?? 0) >= (count.support_limit ?? 5);
  const thread = openId && <Thread key={openId} id={openId} labels={labels} onBack={wide ? undefined : () => setOpenId(null)} onChanged={() => void load(true)} />;

  const list = state.loading && !state.cases.length ? (
    <div className="flex justify-center py-16">
      <Spinner className="h-6 w-6" />
    </div>
  ) : state.cases.length === 0 && !state.error ? (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/5 text-slate-500">
        <MessagesSquare size={26} strokeWidth={1.7} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{t("cases.emptyTitle")}</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{t("cases.emptyHint")}</p>
    </div>
  ) : (
    <ul className="divide-y divide-slate-100">
      {state.cases.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => setOpenId(c.id)} className={cn("flex w-full gap-3 px-5 py-4 text-start transition hover:bg-ink/[0.03]", wide && openId === c.id && "bg-forest/[0.06]")}>
            <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", c.state === "ACTION_NEEDED" ? "bg-amber-500" : "bg-transparent")} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span dir="auto" className={cn("truncate text-sm text-ink", c.state === "ACTION_NEEDED" ? "font-bold" : "font-semibold")}>{c.title}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{formatShortDate(c.last_message_at ?? c.opened_at)}</span>
              </span>
              <span dir="auto" className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                {c.last_from === "ME" && c.last_message ? <span className="font-semibold">{t("cases.you")}: </span> : null}
                {c.last_message || "—"}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatePill state={c.state} />
                <CategoryTag code={c.category} labels={labels} />
                <span className="text-[11px] text-slate-400">{c.case_number}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("cases.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("cases.tagline")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedTabs
            items={["OPEN", "CLOSED", "ALL"].map((key) => ({ key, label: t(`cases.tab.${key}`) }))}
            value={tab}
            onChange={(key) => {
              setTab(key);
              setPages(1);
            }}
          />
          <span title={atLimit ? t("cases.limitReached", { max: count.support_limit ?? 5 }) : undefined}>
            <Button disabled={atLimit || !categories.length} onClick={() => setCreating(true)} className="h-9 px-3 py-0 text-xs">
              <MessageSquarePlus size={15} /> {t("cases.new")}
            </Button>
          </span>
        </div>
      </div>
      {atLimit && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{t("cases.limitReached", { max: count.support_limit ?? 5 })}</p>}

      {state.error && (
        <div className="mb-4">
          <ErrorState message={state.error} onRetry={() => void load()} />
        </div>
      )}

      {!wide && thread ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-sm">{thread}</div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-sm">
            {list}
            {state.cases.length < state.total && (
              <div className="border-t border-slate-100 p-3 text-center">
                <Button variant="secondary" pending={state.loading} onClick={() => setPages((value) => value + 1)} className="h-10 w-full py-0">
                  {t("cases.more")}
                </Button>
              </div>
            )}
          </div>
          {wide && (
            <div className="sticky top-28 overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-sm">
              {thread || (
                <div className="flex flex-col items-center py-20 text-center">
                  <MessagesSquare size={26} strokeWidth={1.7} className="text-slate-400" />
                  <p className="mt-3 text-sm font-semibold text-ink">{t("cases.pickTitle")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {creating && (
        <NewCaseForm
          categories={categories}
          onClose={() => setCreating(false)}
          onOpened={(kase) => {
            setCreating(false);
            setTab("OPEN");
            setOpenId(kase?.id ?? null);
            void load(true);
          }}
        />
      )}
    </div>
  );
}
