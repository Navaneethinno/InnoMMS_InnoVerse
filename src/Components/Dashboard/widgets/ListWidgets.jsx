import WalletBadges from "@/Components/Common/WalletBadges";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowRight, ArrowRightLeft, History, Landmark, ShieldCheck } from "lucide-react";
import { useSelector } from "react-redux";
import { TransactionLine } from "@/Components/Account/History";
import FitText from "@/Components/Common/FitText";
import { formatMoney } from "@/Utils/Lib/format";
import { useAccountData } from "../layout/accountData";
import { WidgetCard } from "./WidgetCard";

const Status = ({ loading, error, empty, children }) => {
  const { t } = useTranslation();
  if (loading) return <div className="min-h-24 flex-1 animate-pulse rounded-xl bg-slate-200/60" />;
  if (error) return <p className="flex min-h-24 flex-1 items-center justify-center px-2 text-center text-xs text-red-600 dark:text-red-300">{typeof error === "string" ? error : t("dash.couldNotLoad")}</p>;
  if (empty) return <p className="flex min-h-24 flex-1 items-center justify-center text-xs text-slate-500">{empty}</p>;
  return children;
};

export function WalletsWidget() {
  const { t } = useTranslation();
  const { wallets, loading, walletsError: error } = useAccountData();
  return (
    <WidgetCard title={t("dash.accounts")} icon={Landmark}>
      <Status loading={loading && !wallets} error={!wallets && error} empty={wallets?.length === 0 && t("dash.noWallets")}>
        <ul className="grid grid-cols-1 gap-3">
          {(wallets ?? []).map((wallet) => (
            <li key={wallet.acct_num} className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-slate-100/70 px-3 py-2.5">
              <div className="min-w-[7rem] flex-1">
                <p title={wallet.acct_product_name ?? wallet.digital_product_name} className="line-clamp-2 break-words text-xs font-bold text-slate-800">
                  {wallet.acct_product_name ?? wallet.digital_product_name ?? wallet.acct_num}
                </p>
                <p className="break-all text-[11px] text-slate-500">{wallet.acct_num}</p>
                <WalletBadges wallet={wallet} className="mt-1" />
              </div>
              <FitText max={13} min={9} className="w-full text-right font-bold text-slate-800">{formatMoney(wallet.avail_bal, wallet.currency_code)}</FitText>
            </li>
          ))}
        </ul>
      </Status>
    </WidgetCard>
  );
}

// A card load or unload moves money between two of the merchant's own accounts, so
// it comes as two lines (the wallet's and the card's) with one reference. The
// dashboard lists the move once: the line of the account it was made from.
const OWN_MOVES = new Set(["CARD_LOAD", "CARD_UNLOAD"]);
function oneLinePerMove(items) {
  const chosen = new Map();
  for (const item of items) {
    if (!OWN_MOVES.has(item.txn_type)) continue;
    const current = chosen.get(item.rrn);
    if (!current || (item.leg_role === "PRIMARY" && current.leg_role !== "PRIMARY")) chosen.set(item.rrn, item);
  }
  return items.filter((item) => !OWN_MOVES.has(item.txn_type) || chosen.get(item.rrn) === item);
}

export function RecentTransactionsWidget() {
  const { t } = useTranslation();
  const { summary, loading, summaryError: error } = useAccountData();
  const items = oneLinePerMove(summary?.recent_transactions ?? []);
  return (
    <WidgetCard
      title={t("dash.recentTransactions")}
      icon={Activity}
      action={
        <Link to="/history" className="flex shrink-0 items-center gap-1 text-xs font-bold text-ink hover:underline">
          {t("nav.history")} <ArrowRight size={12} />
        </Link>
      }
    >
      <Status loading={loading && items.length === 0} error={items.length === 0 && error} empty={!loading && items.length === 0 && t("history.empty")}>
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 6).map((item, index) => (
            <TransactionLine key={`${item.rrn}-${index}`} item={item} />
          ))}
        </ul>
      </Status>
    </WidgetCard>
  );
}

// `feature`: the menu's feature that has to be on for this merchant.
const ACTIONS = [
  { key: "send", icon: ArrowRightLeft, to: "/send", feature: "send" },
  { key: "history", icon: History, to: "/history", feature: "history" },
  { key: "security", icon: ShieldCheck, to: "/security", feature: "security" },
];
export function QuickActionsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const features = useSelector((state) => state.auth.user?.features);
  const actions = ACTIONS.filter((action) => features?.[action.feature] !== false);
  return (
    <WidgetCard title={t("dash.quickActions")} icon={ArrowRightLeft}>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ key, icon, to }) => {
          const Icon = icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 px-1 py-3 text-center text-[11px] font-bold text-slate-700 transition hover:border-ink hover:bg-ink/5"
            >
              <Icon size={16} className="text-ink" />
              {t(`dash.action.${key}`)}
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
