import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import FitText from "@/Components/Common/FitText";
import { formatMoney } from "@/Utils/Lib/format";
import { monthTotals, useAccountData } from "@/Hooks/Dashboard/useAccountData";
import { Balance, BalanceEye, BalanceGroup } from "@/Components/Common/Balance";

function StatCard({ label, value, sub, icon, loading, action }) {
  const Icon = icon;
  return (
    <BalanceGroup>
      <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
        <p className="flex items-center gap-1 pe-10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          {label}
          {action}
        </p>
        <span className="absolute end-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl brand-gradient text-lime shadow-md">
          <Icon size={15} strokeWidth={2} />
        </span>
        <div>
          {loading ? (
            <span className="block h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <FitText className="font-black leading-none tracking-tight text-slate-800">
              {value}
            </FitText>
          )}
          {sub && (
            <p className="mt-1.5 break-words text-[11px] font-medium text-slate-500">
              {sub}
            </p>
          )}
        </div>
      </div>
    </BalanceGroup>
  );
}

// Wallet balances added up per currency; the first currency is the headline.
const totalsByCurrency = (wallets) => {
  const totals = new Map();
  for (const wallet of wallets ?? [])
    totals.set(
      wallet.currency_code,
      (totals.get(wallet.currency_code) ?? 0) + Number(wallet.avail_bal ?? 0),
    );
  return [...totals.entries()];
};

export function BalanceWidget() {
  const { t } = useTranslation();
  const { wallets, loading } = useAccountData();
  const [first, ...others] = totalsByCurrency(wallets);
  return (
    <StatCard
      label={t("dash.totalBalance")}
      loading={loading && !wallets}
      value={first ? <Balance value={first[1]} currency={first[0]} /> : "—"}
      sub={
        others.length
          ? others.map(([currency, total]) => (
              <span key={currency} className="me-2">
                <Balance value={total} currency={currency} />
              </span>
            ))
          : null
      }
      action={<BalanceEye size={14} className="-my-2 h-7 w-7" />}
      icon={Wallet}
    />
  );
}

// This month's income and spending, one under the other.
export function IncomeSpendingWidget() {
  const { t } = useTranslation();
  const { wallets, summary, loading } = useAccountData();
  const currency = wallets?.[0]?.currency_code;
  const totals = monthTotals(summary, currency);
  const rows = [
    {
      key: "income",
      icon: ArrowDownRight,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    { key: "spending", icon: ArrowUpRight, tone: "text-slate-600" },
  ];
  return (
    <div className="relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
      <p className="pe-10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
        {t("dash.incomeSpending")}
      </p>
      <span className="absolute end-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl brand-gradient text-lime shadow-md">
        <ArrowUpDown size={15} strokeWidth={2} />
      </span>
      {rows.map(({ key, icon, tone }) => {
        const Icon = icon;
        return (
          <div key={key} className="min-w-0">
            <p
              className={`flex items-center gap-1 text-[11px] font-semibold ${tone}`}
            >
              <Icon size={12} /> {t(`dash.${key}`)}
            </p>
            {loading && !wallets ? (
              <span className="mt-1 block h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
            ) : (
              <FitText
                max={20}
                min={11}
                className="font-black leading-tight tracking-tight text-slate-800"
              >
                {formatMoney(totals[key], currency)}
              </FitText>
            )}
          </div>
        );
      })}
      <p className="mt-auto text-[11px] font-medium text-slate-500">
        {t("dash.thisMonth")}
      </p>
    </div>
  );
}
