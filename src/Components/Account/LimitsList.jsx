import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadLimits } from "@/Services/Account/account.api";
import { formatMoney } from "@/Utils/Lib/format";

// How much of each limit is left for the wallet and kind of payment about to be
// made, before an amount is typed. Nothing is drawn when no limit applies.
export default function LimitsList({ wallet, txnType }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const acctNum = wallet?.acct_num;
  useEffect(() => {
    if (!acctNum) return undefined;
    let cancelled = false;
    loadLimits(acctNum)
      .then((reply) => !cancelled && setRows(reply))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [acctNum]);

  const entry = rows.find((row) => row.acct_num === acctNum);
  const limits = entry?.types?.find((type) => type.txn_type === txnType)?.limits ?? [];
  if (!limits.length) return null;
  const currency = entry?.currency_code ?? wallet?.currency_code;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-paper/60 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{t("limits.title")}</p>
      <ul className="space-y-3">
        {limits.map((limit, index) => {
          const byAmount = limit.max_amount != null;
          const max = Number(byAmount ? limit.max_amount : limit.max_count);
          const left = Number(byAmount ? limit.left_amount : limit.left_count);
          const usedShare = max > 0 && Number.isFinite(left) ? Math.min(100, Math.max(0, ((max - left) / max) * 100)) : 0;
          const label = t(`limits.type.${limit.limit_type}`, { defaultValue: String(limit.limit_type ?? "").replaceAll("_", " ").toLowerCase() });
          return (
            <li key={`${limit.limit_type}-${index}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className="font-semibold capitalize text-slate-700">{label}</span>
                <span className="text-slate-500">
                  {byAmount
                    ? t("limits.leftOfAmount", { left: formatMoney(left, currency), max: formatMoney(max, currency) })
                    : t("limits.leftOfCount", { left, max })}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-forest transition-all dark:bg-lime" style={{ width: `${usedShare}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
