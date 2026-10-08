import { useTranslation } from "react-i18next";
import { Undo2 } from "lucide-react";
import { formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// The payments customers made to this merchant, to pick the one to refund.
// `payments` null while loading.
export default function RefundPicker({ payments, picked, onPick }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{t("refund.pick", { defaultValue: "Payment to refund" })}</p>
      {payments === null ? (
        <p className="text-sm text-slate-500">{t("cards.loading")}</p>
      ) : payments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">{t("refund.none", { defaultValue: "No payments to refund yet." })}</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {payments.map((payment) => (
            <li key={payment.rrn}>
              <button
                type="button"
                onClick={() => onPick(payment)}
                aria-pressed={picked?.rrn === payment.rrn}
                className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", picked?.rrn === payment.rrn ? "border-ink bg-ink/5" : "border-slate-200 hover:bg-ink/5")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                  <Undo2 size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">{payment.counterparty_name || payment.description}</span>
                  <span className="block text-xs text-slate-500">{formatDateTime(payment.tran_date_time)}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-slate-800">{formatMoney(payment.amount, payment.currency_code)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
