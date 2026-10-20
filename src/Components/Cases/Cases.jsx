import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ArrowLeft, FileImage, FileText, Lock, MessagesSquare, Paperclip, Send, X } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import Spinner from "@/Components/Common/Spinner";
import { useMediaQuery, WIDE_QUERY } from "@/Hooks/Layout/useMediaQuery";
import { downloadCaseFile, getCase, listCases, replyToCase, uploadCaseFile } from "@/Services/Cases/cases.api";
import { useNotificationReceived } from "@/Services/api/liveUpdates";
import { userUpdated } from "@/Redux/slices/authSlice";
import { formatDateTime, formatShortDate } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

const LIMIT = 20;
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const STATE_TONE = {
  ACTION_NEEDED: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  CLOSED: "bg-ink/5 text-slate-500",
};

function StatePill({ state }) {
  const { t } = useTranslation();
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATE_TONE[state] ?? STATE_TONE.CLOSED)}>{t(`cases.state.${state}`, { defaultValue: state })}</span>;
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
      className={cn("flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition", mine ? "border-white/30 bg-white/10 hover:bg-white/20" : "border-slate-200 bg-surface hover:border-forest/40")}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon size={15} className="shrink-0" />}
      <span className="truncate">{file.name || t("cases.file")}</span>
    </button>
  );
}

// One case: its posts as a conversation (staff on the left, the merchant on
// the right) and, while it is open, a reply box with up to 5 files.
function Thread({ id, onBack, onChanged }) {
  const { t } = useTranslation();
  const [kase, setKase] = useState(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]); // [{ key, name, path?, uploading, error? }]
  const [sending, setSending] = useState(false);
  const fileInput = useRef(null);
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
    setKase(null);
    setBody("");
    setFiles([]);
    void load();
  }, [load]);
  useNotificationReceived(() => void load());
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [kase?.posts?.length]);

  const pick = async (list) => {
    const room = MAX_FILES - files.length;
    const chosen = [...list].slice(0, Math.max(0, room));
    if (list.length > room) toast.error(t("cases.tooManyFiles", { max: MAX_FILES }));
    for (const file of chosen) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_BYTES) {
        setFiles((all) => [...all, { key, name: file.name, error: t("cases.fileTooBig") }]);
        continue;
      }
      setFiles((all) => [...all, { key, name: file.name, uploading: true }]);
      try {
        const stored = await uploadCaseFile(file);
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, path: stored.path } : f)));
      } catch (failure) {
        setFiles((all) => all.map((f) => (f.key === key ? { ...f, uploading: false, error: failure.message } : f)));
      }
    }
  };

  const ready = files.filter((f) => f.path);
  const uploading = files.some((f) => f.uploading);
  const send = async () => {
    if (!body.trim() && !ready.length) return;
    setSending(true);
    try {
      const next = await replyToCase({ id, body: body.trim(), files: ready.map((f) => f.path) });
      setKase(next);
      setBody("");
      setFiles([]);
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
          <button type="button" onClick={onBack} aria-label={t("cases.back")} className="-ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-ink/5">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p dir="auto" className="font-bold text-ink">{kase.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {kase.case_number} · {t("cases.openedOn", { date: formatShortDate(kase.opened_at) })}
          </p>
        </div>
        <StatePill state={kase.state} />
      </div>

      <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {(kase.posts ?? []).map((post) => {
          const mine = post.from === "ME";
          return (
            <li key={post.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", mine ? "rounded-br-md bg-forest text-white dark:bg-lime dark:text-on-secondary" : "rounded-bl-md border border-slate-200 bg-paper text-ink")}>
                {!mine && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{t("brand.name")}</p>}
                {post.body && <p dir="auto" className="whitespace-pre-wrap break-words">{post.body}</p>}
                {post.files?.length > 0 && (
                  <div className={cn("grid gap-1.5", post.body && "mt-2")}>
                    {post.files.map((file) => (
                      <Attachment key={file.path} file={file} mine={mine} />
                    ))}
                  </div>
                )}
                <p className={cn("mt-1 text-right text-[10px]", mine ? "text-white/70 dark:text-on-secondary/70" : "text-slate-400")}>{formatDateTime(post.at)}</p>
              </div>
            </li>
          );
        })}
        <li ref={end} aria-hidden="true" />
      </ol>

      {kase.can_reply ? (
        <div className="border-t border-slate-100 p-3">
          {files.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <li key={f.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs", f.error ? "border-red-300 text-red-600" : "border-slate-200")}>
                  {f.uploading ? <Spinner className="h-3 w-3" /> : <Paperclip size={12} />}
                  <span className="max-w-40 truncate">{f.name}</span>
                  {f.error && <span className="text-[10px]">· {f.error}</span>}
                  <button type="button" aria-label={t("cases.removeFile")} onClick={() => setFiles((all) => all.filter((x) => x.key !== f.key))} className="rounded p-0.5 hover:bg-ink/5">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= MAX_FILES || sending}
              aria-label={t("cases.attach")}
              title={t("cases.attachHint", { max: MAX_FILES })}
              className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:text-ink disabled:opacity-40"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(event) => {
                void pick(event.target.files ?? []);
                event.target.value = "";
              }}
            />
            <textarea
              dir="auto"
              value={body}
              maxLength={4000}
              rows={2}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("cases.replyPlaceholder")}
              className="min-h-[3rem] flex-1 resize-none rounded-xl border border-slate-200 bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
            <Button pending={sending} disabled={uploading || (!body.trim() && !ready.length)} onClick={() => void send()} className="h-12 px-4 py-0" aria-label={t("cases.send")}>
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
    </div>
  );
}

// Cases the institution opened about the merchant: each a conversation with
// its staff (staff's internal notes are never shown). Cases waiting for the
// merchant come first; a badge in the menu counts them. On a wide screen the
// list and the open case sit side by side; on a narrow one, one at a time.
export default function Cases() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const wide = useMediaQuery(WIDE_QUERY);
  const [tab, setTab] = useState("OPEN");
  const [pages, setPages] = useState(1);
  const [state, setState] = useState({ loading: true, cases: [], total: 0, error: "" });
  const [openId, setOpenId] = useState(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const reply = await listCases({ state: tab === "ALL" ? "" : tab, page: 1, limit: LIMIT * pages });
        setState({ loading: false, cases: reply.cases ?? [], total: reply.total ?? 0, error: "" });
        dispatch(userUpdated({ casesAction: reply.action_needed ?? 0 }));
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [tab, pages, dispatch],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useNotificationReceived(() => void load(true));

  const thread = openId && <Thread key={openId} id={openId} onBack={wide ? undefined : () => setOpenId(null)} onChanged={() => void load(true)} />;

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
          <button type="button" onClick={() => setOpenId(c.id)} className={cn("flex w-full gap-3 px-5 py-4 text-left transition hover:bg-ink/[0.03]", wide && openId === c.id && "bg-forest/[0.06]")}>
            <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", c.state === "ACTION_NEEDED" ? "bg-amber-500" : "bg-transparent")} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span dir="auto" className={cn("truncate text-sm text-ink", c.state === "ACTION_NEEDED" ? "font-bold" : "font-semibold")}>{c.title}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{formatShortDate(c.last_message_at ?? c.opened_at)}</span>
              </span>
              <span dir="auto" className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{c.last_message || "—"}</span>
              <span className="mt-1.5 flex items-center gap-2">
                <StatePill state={c.state} />
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
        <SegmentedTabs
          items={["OPEN", "CLOSED", "ALL"].map((key) => ({ key, label: t(`cases.tab.${key}`) }))}
          value={tab}
          onChange={(key) => {
            setTab(key);
            setPages(1);
          }}
        />
      </div>

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
    </div>
  );
}
