import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bell, CreditCard, FileText } from "lucide-react";
import { loadCards } from "@/Services/Cards/cards.api";
import { listNotifications } from "@/Services/Inbox/inbox.api";
import { listStatements } from "@/Services/Statements/statements.api";
import { useCardChanged, useNotificationReceived } from "@/Services/api/liveUpdates";
import { formatDate, formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";
import { WidgetCard } from "./WidgetCard";

// A small widget's own data: `load` once, again when `refresh` events say so.
function useWidgetData(load) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const run = useCallback(() => {
    load()
      .then((data) => setState({ data, loading: false, error: "" }))
      .catch((error) => setState((previous) => ({ ...previous, loading: false, error: error.message })));
  }, [load]);
  useEffect(() => run(), [run]);
  return { ...state, run };
}

const Body = ({ loading, error, empty, children }) => {
  if (loading) return <div className="min-h-20 flex-1 animate-pulse rounded-xl bg-slate-200/60" />;
  if (error) return <p className="flex min-h-20 flex-1 items-center justify-center px-2 text-center text-xs text-red-600 dark:text-red-300">{error}</p>;
  if (empty) return <p className="flex min-h-20 flex-1 items-center justify-center px-2 text-center text-xs text-slate-500">{empty}</p>;
  return children;
};

const ViewAll = ({ to }) => {
  const { t } = useTranslation();
  return (
    <Link to={to} className="mt-3 inline-flex items-center gap-1 self-start text-xs font-bold text-ink hover:underline">
      {t("dash.viewAll")} <ArrowRight size={12} />
    </Link>
  );
};

const loadCardList = async () => (await loadCards()).cards ?? [];
export function CardsWidget() {
  const { t } = useTranslation();
  const { data, loading, error, run } = useWidgetData(loadCardList);
  useCardChanged(run);
  return (
    <WidgetCard title={t("dash.cardsWidget")} icon={CreditCard}>
      <Body loading={loading} error={error} empty={data?.length === 0 && t("dash.noCards")}>
        <ul className="space-y-2">
          {(data ?? []).slice(0, 4).map((card) => (
            <li key={card.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-100/70 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-800">{card.product_name}</span>
                <span className="block truncate font-mono text-[11px] text-slate-500">{card.pan_masked}</span>
              </span>
              <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">{t(`cards.ops.${card.ops_status}`, { defaultValue: card.ops_status })}</span>
            </li>
          ))}
        </ul>
        <ViewAll to="/cards" />
      </Body>
    </WidgetCard>
  );
}

const loadLatestNotifications = () => listNotifications({ limit: 4 });
export function NotificationsWidget() {
  const { t } = useTranslation();
  const { data, loading, error, run } = useWidgetData(loadLatestNotifications);
  useNotificationReceived(run);
  const unread = data?.unread ?? 0;
  return (
    <WidgetCard
      title={t("dash.notificationsWidget")}
      icon={Bell}
      action={unread > 0 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{t("dash.unreadCount", { count: unread })}</span> : null}
    >
      <Body loading={loading} error={error} empty={data?.items?.length === 0 && t("dash.noNotifications")}>
        <ul className="space-y-2">
          {(data?.items ?? []).map((item) => (
            <li key={item.id} className="min-w-0 rounded-xl bg-slate-100/70 px-3 py-2">
              <span className={cn("block truncate text-xs text-slate-800", item.read ? "font-semibold" : "font-black")}>{item.title}</span>
              <span className="block text-[11px] text-slate-500">{formatDateTime(item.created_at)}</span>
            </li>
          ))}
        </ul>
        <ViewAll to="/notifications" />
      </Body>
    </WidgetCard>
  );
}

const loadLatestStatements = () => listStatements({ limit: 3 });
export function StatementsWidget() {
  const { t } = useTranslation();
  const { data, loading, error } = useWidgetData(loadLatestStatements);
  return (
    <WidgetCard title={t("dash.statementsWidget")} icon={FileText}>
      <Body loading={loading} error={error} empty={data?.length === 0 && t("dash.noStatements")}>
        <ul className="space-y-2">
          {(data ?? []).map((statement) => (
            <li key={statement.id} className="min-w-0 rounded-xl bg-slate-100/70 px-3 py-2">
              <span className="block truncate text-xs font-bold text-slate-800">
                {formatDate(statement.period_from)} – {formatDate(statement.period_to)}
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {t("statements.closing")}: {formatMoney(statement.closing_balance, statement.currency_code)}
              </span>
            </li>
          ))}
        </ul>
        <ViewAll to="/statements" />
      </Body>
    </WidgetCard>
  );
}
