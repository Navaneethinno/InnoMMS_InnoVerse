import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, Bell, CheckCheck, FileText, MousePointerClick, Percent, ShieldAlert } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import Modal from "@/Components/Common/Modal";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import { useMediaQuery, WIDE_QUERY } from "@/Hooks/Layout/useMediaQuery";
import { listNotifications, markNotificationsRead } from "@/Services/Inbox/inbox.api";
import { useNotificationReceived } from "@/Services/api/liveUpdates";
import { userUpdated } from "@/Redux/slices/authSlice";
import { formatClock, formatShortDate } from "@/Utils/Lib/format";
import { groupByDay } from "@/Utils/Lib/notificationDays";
import { parseNotification } from "@/Utils/Lib/parseNotification";
import NotificationDetail from "./NotificationDetail";
import NotificationRow from "./NotificationRow";
import "./inbox.css";

const LIMIT = 20;
const ICONS = { money_in: ArrowDownLeft, money_out: ArrowUpRight, security: ShieldAlert, statement: FileText, interest: Percent, generic: Bell };
const GROUP_NAMES = { today: "Today", yesterday: "Yesterday", earlier: "Earlier" };

// Everything the institution has sent the merchant, newest first and grouped by
// day, as an inbox: a compact list, and the one picked shown in full beside it
// (in a pop-up on a narrower screen). Each notification is read by
// parseNotification into a kind (money in or out, security, statement,
// interest), a short title, an amount and its details. Opening an unread one
// marks it read. Live: a new one appears as it arrives.
export default function Inbox() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const wide = useMediaQuery(WIDE_QUERY);
  const [state, setState] = useState({ loading: true, items: [], total: 0, unread: 0, error: "" });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pages, setPages] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);

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
  useNotificationReceived(() => void load(true));
  // The panel's pick is not carried into a pop-up when the window narrows.
  useEffect(() => {
    if (!wide) setOpenId(null);
  }, [wide]);

  const read = async (payload, ids) => {
    const reply = await markNotificationsRead(payload).catch(() => null);
    if (!reply) return;
    dispatch(userUpdated({ unread: reply.unread ?? 0 }));
    setState((previous) => ({ ...previous, unread: reply.unread ?? 0, items: previous.items.map((item) => (payload.all || ids.includes(item.id) ? { ...item, read: true } : item)) }));
  };
  const openItem = (item) => {
    setOpenId(item.id);
    if (!item.read) void read({ ids: [item.id] }, [item.id]);
  };
  const markAll = async () => {
    setBusy(true);
    await read({ all: true }, []);
    setBusy(false);
  };

  const brand = t("brand.name");
  const parsed = useMemo(() => new Map(state.items.map((item) => [item.id, parseNotification(item.title, item.body, { brand })])), [state.items, brand]);
  const groups = useMemo(() => groupByDay(state.items), [state.items]);
  const titleOf = (info) => (info.type === "generic" ? info.displayTitle : t(`inbox.type.${info.type}`, { defaultValue: info.displayTitle }));
  const openItemData = state.items.find((item) => item.id === openId);
  const detail = openItemData && (
    <NotificationDetail item={openItemData} info={parsed.get(openItemData.id)} title={titleOf(parsed.get(openItemData.id))} icon={ICONS[parsed.get(openItemData.id).type]} />
  );

  const list =
    state.loading && !state.items.length ? (
      <ul className="divide-y divide-slate-100" aria-hidden="true">
        {[0, 1, 2, 3].map((n) => (
          <li key={n} className="flex items-center gap-3 px-5 py-4">
            <span className="notif-shimmer h-10 w-10 shrink-0 rounded-full" />
            <span className="flex-1 space-y-2">
              <span className="notif-shimmer block h-3.5 w-2/5 rounded" />
              <span className="notif-shimmer block h-3 w-3/5 rounded" />
            </span>
          </li>
        ))}
      </ul>
    ) : state.items.length === 0 && !state.error ? (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="notif-tile-generic flex h-14 w-14 items-center justify-center rounded-2xl">
          <Bell size={26} strokeWidth={1.7} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink">{t("inbox.caughtUp", { defaultValue: "You're all caught up" })}</h2>
        <p className="notif-muted mt-1 text-sm">{unreadOnly ? t("inbox.emptyUnread", { defaultValue: "No unread notifications." }) : t("inbox.emptyAll", { defaultValue: "No notifications yet." })}</p>
      </div>
    ) : (
      groups.map((group) => (
        <section key={group.key} aria-label={t(`inbox.${group.key}`, { defaultValue: GROUP_NAMES[group.key] })}>
          <h2 className="notif-muted sticky top-0 z-[1] border-b border-slate-100 bg-surface/95 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur">
            {t(`inbox.${group.key}`, { defaultValue: GROUP_NAMES[group.key] })}
          </h2>
          <ul className="divide-y divide-slate-100">
            {group.items.map((item) => {
              const info = parsed.get(item.id);
              return (
                <li key={item.id}>
                  <NotificationRow
                    type={info.type}
                    icon={ICONS[info.type]}
                    title={titleOf(info)}
                    summary={info.summary}
                    amount={info.amount?.text}
                    direction={info.direction}
                    when={group.key === "earlier" ? formatShortDate(item.created_at) : formatClock(item.created_at)}
                    dateTime={item.created_at}
                    unread={!item.read}
                    unreadLabel={t("inbox.unread")}
                    selected={wide && openId === item.id}
                    onOpen={() => openItem(item)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))
    );

  return (
    <div className="notif w-full">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("inbox.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("inbox.tagline", { defaultValue: "Payments, security alerts and statements from your bank." })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedTabs
            items={[
              { key: "all", label: t("inbox.all", { defaultValue: "All" }) },
              { key: "unread", label: state.unread > 0 ? `${t("inbox.unread")} · ${state.unread}` : t("inbox.unread") },
            ]}
            value={unreadOnly ? "unread" : "all"}
            onChange={(key) => {
              setUnreadOnly(key === "unread");
              setPages(1);
            }}
          />
          <Button variant="secondary" pending={busy} disabled={state.unread === 0} onClick={() => void markAll()} className="notif-focus h-9 px-3 py-0 text-xs">
            <CheckCheck size={15} /> {t("inbox.markAll")}
          </Button>
        </div>
      </div>

      {state.error && (
        <div className="mb-4">
          <ErrorState message={state.error} onRetry={() => void load()} />
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-sm">
          {list}
          {state.items.length < state.total && (
            <div className="border-t border-slate-100 p-3 text-center">
              <Button variant="secondary" pending={state.loading} onClick={() => setPages((value) => value + 1)} className="notif-focus h-10 w-full py-0">
                {t("inbox.more")}
              </Button>
            </div>
          )}
        </div>

        {wide && (
          <aside className="sticky top-28 rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
            {detail || (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="notif-tile-generic flex h-12 w-12 items-center justify-center rounded-2xl">
                  <MousePointerClick size={22} strokeWidth={1.8} />
                </span>
                <p className="mt-4 text-sm font-semibold text-ink">{t("inbox.pickTitle", { defaultValue: "Select a notification" })}</p>
                <p className="notif-muted mt-1 max-w-[16rem] text-sm">{t("inbox.pickHint", { defaultValue: "Its details, amount and reference will show here." })}</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!wide && (
        <Modal open={Boolean(detail)} onOpenChange={(open) => !open && setOpenId(null)} title={t("inbox.details", { defaultValue: "Notification" })}>
          {detail}
        </Modal>
      )}
    </div>
  );
}
