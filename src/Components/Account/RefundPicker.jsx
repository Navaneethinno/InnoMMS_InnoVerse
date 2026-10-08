import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ReceiptText, Search } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import TextField from "@/Components/Common/TextField";
import { useRefundablePayments } from "@/Hooks/Transactions/useRefundablePayments";
import { formatClock, formatDate, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// The day a line belongs to, as a heading: Today, Yesterday, else the date.
const dayKey = (value) => String(value ?? "").slice(0, 10);
function dayLabel(key, t) {
  const today = new Date();
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (key === iso(today)) return t("refund.today", { defaultValue: "Today" });
  if (key === iso(yesterday)) return t("refund.yesterday", { defaultValue: "Yesterday" });
  return formatDate(key);
}

// The payment picked, in place of the list: who paid, how much, when, and its
// reference, with a way back to the list.
function PickedPayment({ payment, onChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{t("refund.pick")}</p>
      <div className="flex items-center gap-3 rounded-2xl border border-ink bg-ink/5 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-white dark:bg-lime dark:text-on-secondary">
          <Check size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-800">{payment.counterparty_name || payment.description}</span>
          <span className="block truncate text-xs text-slate-500">
            {formatDate(payment.tran_date_time)} · {formatClock(payment.tran_date_time)} · {t("refund.ref", { defaultValue: "Ref" })} {payment.rrn}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-black text-slate-800">{formatMoney(payment.amount, payment.currency_code)}</span>
          <button type="button" onClick={onChange} className="text-xs font-bold text-ink underline-offset-2 hover:underline">
            {t("refund.change", { defaultValue: "Change" })}
          </button>
        </span>
      </div>
    </div>
  );
}

// The payments customers made, to pick the one to refund. However many there
// are, only one period is asked for at a time (newest first, a page at a
// time with "Load more"), grouped by day; the search narrows what is loaded by
// name, reference or amount. Once one is picked it alone is shown.
// `preselectRrn`: a payment to pick as soon as it is loaded (History's Refund).
export default function RefundPicker({ picked, onPick, preselectRrn }) {
  const { t } = useTranslation();
  const payments = useRefundablePayments({ initialPeriod: preselectRrn ? "LAST_12_MONTHS" : undefined });
  const [query, setQuery] = useState("");

  // Only once: "Change" afterwards must go back to the list.
  const preselected = useRef(false);
  useEffect(() => {
    if (!preselectRrn || preselected.current) return;
    const wanted = payments.items?.find((item) => item.rrn === preselectRrn);
    if (!wanted) return;
    preselected.current = true;
    onPick(wanted);
  }, [payments.items, preselectRrn, onPick]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (payments.items ?? []).filter(
      (item) => !needle || [item.counterparty_name, item.rrn, item.amount, item.description].some((value) => String(value ?? "").toLowerCase().includes(needle)),
    );
    const byDay = new Map();
    for (const item of matches) {
      const key = dayKey(item.tran_date_time);
      byDay.set(key, [...(byDay.get(key) ?? []), item]);
    }
    return [...byDay.entries()];
  }, [payments.items, query]);

  if (picked) return <PickedPayment payment={picked} onChange={() => onPick(null)} />;

  const loaded = payments.items?.length ?? 0;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{t("refund.pick")}</p>
        {payments.items && payments.total > 0 && <p className="text-xs text-slate-500">{t("refund.count", { count: payments.total })}</p>}
      </div>
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <TextField
          name="refund-search"
          icon={Search}
          aria-label={t("refund.search")}
          placeholder={t("refund.search")}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {payments.periods.length > 0 && (
          <div className="[&_label]:sr-only">
            <FilterSelect
              label={t("refund.period", { defaultValue: "Period" })}
              options={payments.periods.map((item) => ({ value: item.code, label: item.label }))}
              value={payments.period}
              onChange={payments.setPeriod}
            />
          </div>
        )}
      </div>

      {payments.error && (
        <div className="mt-3">
          <ErrorState message={payments.error} />
        </div>
      )}

      <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-2xl border border-slate-200">
        {payments.items === null ? (
          <div className="space-y-2 p-3" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-14 animate-pulse rounded-xl bg-slate-200/60" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <ReceiptText size={26} className="text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">
              {loaded ? t("refund.noMatch", { defaultValue: "No payment matches your search." }) : t("refund.none")}
            </p>
          </div>
        ) : (
          groups.map(([key, items]) => (
            <section key={key}>
              <h3 className="sticky top-0 z-10 border-b border-slate-100 bg-surface/95 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 backdrop-blur">
                {dayLabel(key, t)}
              </h3>
              <ul className="divide-y divide-slate-100">
                {items.map((payment) => (
                  <li key={payment.rrn}>
                    <button
                      type="button"
                      onClick={() => onPick(payment)}
                      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink/5")}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-bold uppercase text-ink">
                        {String(payment.counterparty_name || "?").trim().charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">{payment.counterparty_name || payment.description}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {formatClock(payment.tran_date_time)} · {t("refund.ref")} {payment.rrn}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-800">{formatMoney(payment.amount, payment.currency_code)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {payments.hasMore && (
          <div className="border-t border-slate-100 p-3">
            <Button type="button" variant="secondary" onClick={() => void payments.more()} className="w-full">
              {t("refund.loadMore", { defaultValue: "Load more" })}
            </Button>
          </div>
        )}
        {payments.loading && payments.items !== null && <p className="p-3 text-center text-xs text-slate-500">{t("cards.loading")}</p>}
      </div>
    </div>
  );
}
