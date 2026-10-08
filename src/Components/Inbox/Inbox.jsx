import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, Bell, CheckCheck, ChevronDown, Copy, FileText, Percent, ShieldAlert } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import ToggleSwitch from "@/Components/Common/ToggleSwitch";
import { listNotifications, markNotificationsRead } from "@/Services/Inbox/inbox.api";
import { useNotificationReceived } from "@/Services/api/liveUpdates";
import { userUpdated } from "@/Redux/slices/authSlice";
import { formatClock, formatShortDate } from "@/Utils/Lib/format";
import { groupByDay } from "@/Utils/Lib/notificationDays";
import { parseNotification } from "@/Utils/Lib/parseNotification";
import { cn } from "@/Utils/Lib/utils";
import "./inbox.css";

const LIMIT = 20;
const ICONS = { money_in: ArrowDownLeft, money_out: ArrowUpRight, security: ShieldAlert, statement: FileText, interest: Percent, generic: Bell };
const GROUP_NAMES = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" };
const FIELD_NAMES = { from: "From", account: "Account", reference: "Reference", balance: "Available balance" };

// Everything the institution has sent the merchant, newest first and grouped by
// day. Each notification is read by parseNotification into a kind (money in or
// out, security, statement, interest), a short title, an amount and a summary;
// opening it shows the details found in its message, or the message itself if
// none can be told apart. Opening an unread one marks it read. Live: a new one
// appears as it arrives.
export default function Inbox() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [state, setState] = useState({ loading: true, items: [], total: 0, unread: 0, error: "" });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(null);
  const copyTimer = useRef(null);

  // Loads pages 1..`pages` in one go, so a refresh keeps what is on screen.
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const reply = await listNotifications({ page: 1, limit: LIMIT * pages, unreadOnly });
        setState({ loading: false, items: reply.items ?? [], total: reply.total ?? 0, unread: reply.unread ?? 0, error: "" });
        dispatch(userUpdated({ unread: reply.unread ?? 0 }));
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false, error: error.message }));
      }
    },
    [pages, unreadOnly, dispatch],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  useNotificationReceived(() => void load(true));

  const read = async (payload, ids) => {
    const reply = await markNotificationsRead(payload).catch(() => null);
    if (!reply) return;
    dispatch(userUpdated({ unread: reply.unread ?? 0 }));
    setState((previous) => ({ ...previous, unread: reply.unread ?? 0, items: previous.items.map((item) => (payload.all || ids.includes(item.id) ? { ...item, read: true } : item)) }));
  };
  // One card is open at a time; opening an unread one marks it read.
  const toggle = (item) => {
    setOpen((current) => (current === item.id ? null : item.id));
    if (!item.read) void read({ ids: [item.id] }, [item.id]);
  };
  const markAll = async () => {
    setBusy(true);
    await read({ all: true }, []);
    setBusy(false);
  };
  const copyReference = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(id);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 2000);
  };

  const brand = t("brand.name");
  const parsed = useMemo(() => new Map(state.items.map((item) => [item.id, parseNotification(item.title, item.body, { brand })])), [state.items, brand]);
  const groups = useMemo(() => groupByDay(state.items), [state.items]);

  return (
    <div className="notif w-full">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-ink">{t("inbox.title")}</h1>
            {state.unread > 0 && <span className="rounded-full bg-forest px-3 py-1 text-xs font-bold text-lime dark:bg-lime dark:text-on-secondary">{t("dash.unreadCount", { count: state.unread })}</span>}
          </div>
          <p className="notif-muted mt-1 text-[15px]">{t("inbox.tagline", { defaultValue: "Payments, security alerts and statements from your bank." })}</p>
        </div>
        <Button variant="secondary" pending={busy} disabled={state.unread === 0} onClick={() => void markAll()} className="notif-focus h-11 border-ink/25 py-0">
          <CheckCheck size={16} /> {t("inbox.markAll")}
        </Button>
      </div>
      <div className="mb-5">
        <ToggleSwitch
          checked={unreadOnly}
          label={t("inbox.unreadOnly")}
          onChange={(value) => {
            setUnreadOnly(value);
            setPages(1);
          }}
        />
      </div>

      {state.error && (
        <div className="mb-4">
          <ErrorState message={state.error} onRetry={() => void load()} />
        </div>
      )}
      {state.loading && !state.items.length ? (
        <ul className="space-y-[10px]" aria-hidden="true">
          {[0, 1, 2].map((n) => (
            <li key={n} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-4">
              <span className="notif-shimmer h-10 w-10 shrink-0 rounded-xl" />
              <span className="flex-1 space-y-2">
                <span className="notif-shimmer block h-3.5 w-2/5 rounded" />
                <span className="notif-shimmer block h-3 w-3/5 rounded" />
              </span>
            </li>
          ))}
        </ul>
      ) : state.items.length === 0 && !state.error ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
          <span className="notif-tile-generic flex h-14 w-14 items-center justify-center rounded-2xl">
            <Bell size={26} strokeWidth={1.7} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink">{t("inbox.caughtUp", { defaultValue: "You're all caught up" })}</h2>
          <p className="notif-muted mt-1 text-sm">{unreadOnly ? t("inbox.emptyUnread", { defaultValue: "No unread notifications." }) : t("inbox.emptyAll", { defaultValue: "No notifications yet." })}</p>
        </div>
      ) : (
        <div className="space-y-[22px]">
          {groups.map((group) => (
            <section key={group.key} aria-label={t(`inbox.${group.key}`, { defaultValue: GROUP_NAMES[group.key] })}>
              <h2 className="notif-muted mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em]">{t(`inbox.${group.key}`, { defaultValue: GROUP_NAMES[group.key] })}</h2>
              <ul className="space-y-[10px]">
                {group.items.map((item) => {
                  const info = parsed.get(item.id);
                  const Icon = ICONS[info.type];
                  const isOpen = open === item.id;
                  const unread = !item.read;
                  const reference = info.details.find((detail) => detail.key === "reference")?.value;
                  const title = info.type === "generic" ? info.displayTitle : t(`inbox.type.${info.type}`, { defaultValue: info.displayTitle });
                  const when = group.key === "earlier" ? formatShortDate(item.created_at) : formatClock(item.created_at);
                  return (
                    <li key={item.id}>
                      <div className={cn("rounded-2xl border shadow-sm", unread ? "border-lime/50 bg-lime/[0.16]" : "border-slate-200 bg-surface")}>
                        <button type="button" aria-expanded={isOpen} onClick={() => toggle(item)} className="notif-focus flex min-h-[44px] w-full items-start gap-3 rounded-2xl p-4 text-left">
                          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", `notif-tile-${info.type}`)} aria-hidden="true">
                            <Icon size={18} strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                              <span className={cn("text-[15px] text-ink [overflow-wrap:anywhere]", unread ? "font-bold" : "font-semibold")}>{title}</span>
                              {info.amount && (
                                <span className={cn("font-bold tabular-nums", info.direction === "in" ? "notif-in" : "text-ink")}>
                                  {info.direction === "in" ? "+ " : info.direction === "out" ? "− " : ""}
                                  {info.amount.text}
                                </span>
                              )}
                            </span>
                            <span className="notif-muted mt-0.5 block truncate text-sm">{info.summary}</span>
                          </span>
                          <span className="notif-muted flex shrink-0 items-center gap-2 text-xs">
                            <time dateTime={item.created_at}>{when}</time>
                            {unread && <span className="notif-dot h-[9px] w-[9px] rounded-full" role="img" title={t("inbox.unread")} aria-label={t("inbox.unread")} />}
                            <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4">
                            {info.details.length ? (
                              <dl className="notif-detail grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl p-4 sm:grid-cols-2">
                                {info.details.map((detail) => (
                                  <div key={detail.key} className="min-w-0">
                                    <dt className="notif-muted text-xs">{t(`inbox.field.${detail.key}`, { defaultValue: FIELD_NAMES[detail.key] })}</dt>
                                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink [overflow-wrap:anywhere]">{detail.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <p className="notif-detail whitespace-pre-line rounded-xl p-4 text-sm text-ink [overflow-wrap:anywhere]">{item.body}</p>
                            )}
                            {reference && (
                              <button
                                type="button"
                                onClick={() => void copyReference(item.id, reference)}
                                className="notif-focus mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-ink/25 bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-ink/5"
                              >
                                {copied === item.id ? <CheckCheck size={15} /> : <Copy size={15} />}
                                {copied === item.id ? t("inbox.copied", { defaultValue: "Copied" }) : t("inbox.copyRef", { defaultValue: "Copy reference" })}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {state.items.length < state.total && (
        <div className="mt-5 text-center">
          <Button variant="secondary" pending={state.loading} onClick={() => setPages((value) => value + 1)} className="notif-focus h-11 border-ink/25 py-0">
            {t("inbox.more")}
          </Button>
        </div>
      )}
    </div>
  );
}
