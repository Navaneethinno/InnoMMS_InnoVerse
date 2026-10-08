import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";
import { formatDateTime, formatMoney } from "@/Utils/Lib/format";

// One receipt, as the API returns it: rrn, txn_short_desc, txn_time,
// currency_code, txn_amount, fee_amount, entry_amount (the balance after),
// acct_mask, counterparty / merchant names, status, print_count and
// receipt_payload { fee, tax, total_debit, net_credit, from, to, reason }.
// A reprint (print_count > 0) is marked DUPLICATE.
function Line({ label, children, strong }) {
  if (children == null || children === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={cn("min-w-0 break-words text-right text-slate-800", strong && "font-bold")}>{children}</dd>
    </div>
  );
}

export default function ReceiptView({ receipt, className }) {
  const { t } = useTranslation();
  if (!receipt) return null;
  const payload = receipt.receipt_payload ?? {};
  const currency = receipt.currency_code;
  const money = (value) => (value != null && value !== "" ? formatMoney(value, currency) : null);
  // Who, by name only (the wallet number is on the Wallet line). A number with
  // no account is named by the number.
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-300 pb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("receipt.title")}</p>
          <p className="truncate text-base font-semibold text-ink">{receipt.txn_short_desc ?? receipt.txn_type}</p>
        </div>
        {receipt.print_count > 0 && <span className="shrink-0 rounded-full bg-amber-400/25 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-700 dark:text-amber-300">{t("receipt.duplicate")}</span>}
      </div>
      <dl className="divide-y divide-slate-100">
        <Line label={t("receipt.amount")} strong>{money(receipt.txn_amount)}</Line>
        <Line label={t("receipt.fee")}>{receipt.fee_amount != null && Number(receipt.fee_amount) !== 0 ? money(receipt.fee_amount) : null}</Line>
        <Line label={t("receipt.total")}>{money(payload.total_debit)}</Line>
        <Line label={t("receipt.from")}>{payload.from?.name ?? receipt.customer_name}</Line>
        <Line label={t("receipt.wallet")}>{receipt.acct_mask}</Line>
        <Line label={t("receipt.to")}>{payload.to?.name ?? receipt.merchant_name ?? receipt.counterparty_name ?? payload.to?.phone}</Line>
        <Line label={t("receipt.balance")}>{money(receipt.entry_amount)}</Line>
        <Line label={t("receipt.reason")}>{payload.note || payload.reason}</Line>
        <Line label={t("receipt.time")}>{formatDateTime(receipt.txn_time)}</Line>
        <Line label={t("receipt.status")}>{receipt.status}</Line>
        <Line label={t("receipt.reference")}>{receipt.rrn}</Line>
      </dl>
    </div>
  );
}
