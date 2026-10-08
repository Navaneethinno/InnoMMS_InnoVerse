import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCompact, formatMoney } from "@/Utils/Lib/format";
import { monthlyFlow, useAccountData } from "../layout/accountData";
import { WidgetCard } from "./WidgetCard";

// Chart colours follow the theme (and the bank's branding) through CSS
// variables, so light/dark mode needs nothing here.
const INCOME = "rgb(var(--color-secondary))";
const SPENDING = "rgb(var(--chart-2))";
const tooltipStyle = { background: "rgb(var(--color-surface))", border: "1px solid rgb(var(--slate-200))", borderRadius: 12, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "rgb(var(--slate-500))" };

export function CashFlowWidget() {
  const { t, i18n } = useTranslation();
  const { wallets, summary, loading, summaryError: error } = useAccountData();
  const currency = wallets?.[0]?.currency_code;
  const rows = monthlyFlow(summary, currency).map((m) => {
    const [y, mo] = m.month.split("-").map(Number);
    return { ...m, label: new Date(y, mo - 1, 1).toLocaleString(i18n.language, { month: "short" }) };
  });
  return (
    <WidgetCard title={t("dash.cashFlow")} icon={TrendingUp}>
      {loading && !wallets ? (
        <div className="min-h-24 flex-1 animate-pulse rounded-xl bg-slate-200/60" />
      ) : error || rows.length === 0 ? (
        <p className={`flex min-h-24 flex-1 items-center justify-center px-2 text-center text-xs ${error ? "text-red-600 dark:text-red-300" : "text-slate-500"}`}>{error || t("dash.nothingYet")}</p>
      ) : (
        <>
          <div className="min-h-24 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INCOME} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cfSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SPENDING} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SPENDING} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--slate-200))" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={formatCompact} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(v, currency)} />
                <Area type="monotone" dataKey="income" name={t("dash.income")} stroke={INCOME} strokeWidth={2} fill="url(#cfIncome)" />
                <Area type="monotone" dataKey="spending" name={t("dash.spending")} stroke={SPENDING} strokeWidth={2} fill="url(#cfSpending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: INCOME }} />{t("dash.income")}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: SPENDING }} />{t("dash.spending")}</span>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
