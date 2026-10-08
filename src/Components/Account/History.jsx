import { useWalletChanged } from "@/Services/api/liveUpdates";
import { useTxnTypes } from "@/Hooks/Transactions/useTxnTypes";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Download, Printer, Undo2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import Modal from "@/Components/Common/Modal";
import { loadHistory, loadReceipt, loadTransaction, loadWallets } from "@/Services/Account/account.api";
import { cn } from "@/Utils/Lib/utils";
import { formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { downloadReceiptPdf } from "@/Utils/Lib/receiptPdf";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
import ReceiptView from "./ReceiptView";

// Newest first, every module (transfers, payments, refunds, cash, deposits,
// loans, reversals). A line opens that transaction and its receipt.
const LIMIT = 20;
const TYPES = ["P2P_TRANSFER", "P2P_TO_PHONE", "PHONE_TRANSFER_RETURN", "MERCHANT_PAYMENT", "MERCHANT_REFUND", "CASH_IN", "CASH_OUT", "CARD_LOAD", "CARD_UNLOAD", "CARD_PURCHASE_CP", "CARD_PURCHASE_CNP", "CARD_CASH_WITHDRAWAL", "NEW_CARD_FEE", "PHYSICAL_CARD_FEE", "REVERSAL"];

// The line's words in the portal's language: the API's names for the kinds of
// transaction (`types`, a transfer says which way the money went); while those
// are not known, our own labels; anything else keeps the API's `description`.
export const describe = (item, t, types) => {
  const known = types?.find((type) => type.code === item.txn_type);
  if (known) return known.received_label && item.direction === "CR" ? known.received_label : known.label;
  if (item.txn_type === "P2P_TRANSFER") return t(item.direction === "DR" ? "history.moneySent" : "history.moneyReceived");
  const label = item.txn_type ? t(`history.txnType.${item.txn_type}`, { defaultValue: "" }) : "";
  return label || (item.description ?? item.txn_short_desc ?? item.txn_type_name ?? item.txn_type);
};

export function TransactionLine({ item, onOpen }) {
  const { t } = useTranslation();
  const types = useTxnTypes();
  const out = item.direction === "DR";
  const Icon = out ? ArrowUpRight : ArrowDownLeft;
  const who = item.merchant_name ?? item.counterparty_name;
  return (
    <li>
      <button type="button" onClick={() => onOpen?.(item)} disabled={!onOpen} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 py-3 text-left transition enabled:hover:bg-ink/5 sm:px-2">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", out ? "bg-slate-100 text-slate-600" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400")}>
          <Icon size={16} />
        </span>
        <span className="min-w-[10rem] flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{describe(item, t, types)}</span>
          <span className="block break-words text-xs text-slate-500">
            {[who, formatDateTime(item.tran_date_time)].filter(Boolean).join(" · ")}
            {item.status === "REVERSED" && <span className="ml-2 font-semibold text-amber-600">{t("history.reversed")}</span>}
          </span>
        </span>
        <span className="ml-auto max-w-full text-right">
          <span className={cn("block truncate text-sm font-bold", out ? "text-slate-800" : "text-emerald-600 dark:text-emerald-400")}>{formatMoney(item.net_amount ?? item.amount, item.currency_code, { signed: true })}</span>
          {item.balance_after != null && <span className="block truncate text-[11px] text-slate-400">{t("history.balance")} {formatMoney(item.balance_after, item.currency_code)}</span>}
        </span>
      </button>
    </li>
  );
}

// The same lines as a table, for wide screens. The reference sits under the
// date, the wallet column only appears when there is room (2xl), and the fee
// column only when some line on the page has a fee, so the usual width fits
// without scrolling; a click (or Enter on the description) opens the receipt.
function HistoryTable({ items, onOpen }) {
  const { t } = useTranslation();
  const types = useTxnTypes();
  const showFee = items.some((item) => Number(item.fee_amount) > 0);
  const columns = [
    { key: "date" },
    { key: "transaction" },
    { key: "wallet", className: "hidden 2xl:table-cell" },
    { key: "status" },
    { key: "amount", right: true },
    ...(showFee ? [{ key: "fee", right: true }] : []),
    { key: "balance", right: true },
  ];
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-paper/70 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn("whitespace-nowrap px-4 py-3", column.right && "text-right", column.className)}>
                  {t(`history.col.${column.key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const out = item.direction === "DR";
              const Icon = out ? ArrowUpRight : ArrowDownLeft;
              const who = item.merchant_name ?? item.counterparty_name;
              const fee = Number(item.fee_amount);
              const reversed = item.status === "REVERSED";
              return (
                <tr key={`${item.rrn}-${index}`} onClick={() => onOpen(item)} className="cursor-pointer transition hover:bg-ink/5">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="block text-slate-700">{formatDateTime(item.tran_date_time)}</span>
                    <span className="block font-mono text-[11px] text-slate-400" title={t("history.col.reference")}>
                      {item.rrn}
                      {item.channel_type && <span className="font-sans"> · {t(`history.channel.${item.channel_type}`, { defaultValue: item.channel_type })}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", out ? "bg-slate-100 text-slate-600" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400")}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800">{describe(item, t, types)}</span>
                        {who && (
                          <span className="block text-xs text-slate-500">
                            {who}
                            {item.counterparty_acct_num && <span className="text-slate-400"> · {item.counterparty_acct_num}</span>}
                          </span>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600 2xl:table-cell">{item.acct_num}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", reversed ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                      {reversed ? t("history.reversed") : t(`history.status.${item.status}`, { defaultValue: item.status })}
                    </span>
                  </td>
                  <td className={cn("whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums", out ? "text-slate-800" : "text-emerald-600 dark:text-emerald-400")}>
                    {formatMoney(item.net_amount ?? item.amount, item.currency_code, { signed: true })}
                  </td>
                  {showFee && <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">{fee > 0 ? formatMoney(fee, item.currency_code) : "—"}</td>}
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">{item.balance_after != null ? formatMoney(item.balance_after, item.currency_code) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// A payment a customer made to this merchant can be refunded from its receipt.
const refundable = (item) => item?.txn_type === "MERCHANT_PAYMENT" && item?.direction === "CR";

function TransactionDialog({ item, onClose }) {
  const rrn = item?.rrn;
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  const [state, setState] = useState({ loading: true, receipt: null, error: "" });
  useEffect(() => {
    if (!rrn) return;
    setState({ loading: true, receipt: null, error: "" });
    loadTransaction(rrn)
      .then((transaction) => setState({ loading: false, receipt: transaction?.receipt ?? null, error: "" }))
      .catch((error) => setState({ loading: false, receipt: null, error: error.message }));
  }, [rrn]);
  // Printing counts as a reprint: the receipt is asked for again as a duplicate.
  const print = async () => {
    try {
      const receipt = await loadReceipt({ rrn, duplicate: true });
      setState((previous) => ({ ...previous, receipt: receipt ?? previous.receipt }));
      window.setTimeout(() => window.print(), 100);
    } catch (error) {
      setState((previous) => ({ ...previous, error: error.message }));
    }
  };
  return (
    <Modal open={Boolean(rrn)} onOpenChange={(open) => !open && onClose()} title={t("receipt.title")}>
      {state.loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200/60" />
      ) : (
        <>
          {state.error && <ErrorState message={state.error} />}
          <ReceiptView receipt={state.receipt} className="mt-3" />
          {state.receipt && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button onClick={() => void print()} variant="secondary">
                <Printer size={15} />
                {t("history.print")}
              </Button>
              <Button
                onClick={() => void downloadReceiptPdf({ tx: receiptToTransaction(state.receipt, { rrn }), t, brand: t("brand.name"), logoUrl: logo })}
                variant="secondary"
              >
                <Download size={15} />
                {t("pos.download")}
              </Button>
              {refundable(item) && (
                <Link
                  to={`/send?refund=${encodeURIComponent(rrn)}`}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90 dark:bg-lime dark:text-on-secondary dark:hover:bg-lime/90"
                >
                  <Undo2 size={15} />
                  {t("refund.action", { defaultValue: "Refund" })}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export default function History() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ txnType: "", acctId: "", from: "", to: "" });
  const [wallets, setWallets] = useState([]);
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: "" });
  const [open, setOpen] = useState(null);
  const types = useTxnTypes();
  // The filter lists the API's kinds (a transfer as "sent / received"), or ours until they arrive.
  const typeOptions = (types ?? TYPES.map((code) => ({ code }))).map((type) => ({
    value: type.code,
    label: type.label ? (type.received_label ? `${type.label} / ${type.received_label}` : type.label) : t(`history.txnType.${type.code}`, { defaultValue: type.code.replaceAll("_", " ").toLowerCase() }),
  }));

  const load = useCallback((quiet = false) => {
    if (quiet !== true) setState((previous) => ({ ...previous, loading: true, error: "" }));
    loadHistory({ page, limit: LIMIT, ...applied, acctId: applied.acctId ? Number(applied.acctId) : null })
      .then((reply) => setState({ loading: false, items: reply?.items ?? [], total: reply?.total ?? 0, error: "" }))
      .catch((error) => setState({ loading: false, items: [], total: 0, error: error.message }));
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load, t]);
  // The wallets (each has an `id`, which is what the history filters on).
  useEffect(() => {
    loadWallets().then(setWallets).catch(() => {});
  }, []);
  // Money moved: refresh the list quietly.
  useWalletChanged(() => load(true));

  const pages = Math.max(1, Math.ceil(state.total / LIMIT));
  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  const dateInput = "field-control h-11 border-ink/25 py-0 focus:border-ink";
  const first = (page - 1) * LIMIT + 1;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("history.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("history.subtitle")}</p>
      </div>
      <form onSubmit={apply} className="mb-5 grid grid-cols-1 items-end gap-3 rounded-2xl border border-slate-200 bg-surface p-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {wallets.length > 1 && (
          <FilterSelect
            label={t("history.wallet")}
            value={filters.acctId}
            onChange={(value) => setFilters((previous) => ({ ...previous, acctId: value }))}
            options={wallets.map((wallet) => ({ value: String(wallet.id), label: `${wallet.acct_product_name ?? wallet.acct_num} · ${wallet.acct_num}` }))}
            placeholder={t("history.allWallets")}
            clearable
            className="h-11 border-ink/25 py-0"
          />
        )}
        <FilterSelect
          label={t("history.type")}
          value={filters.txnType}
          onChange={(value) => setFilters((previous) => ({ ...previous, txnType: value }))}
          options={typeOptions}
          placeholder={t("history.all")}
          clearable
          className="h-11 border-ink/25 py-0"
        />
        <label className="block text-sm font-medium">
          <span className="mb-2 block">{t("history.from")}</span>
          <input type="date" value={filters.from} onChange={(event) => setFilters((previous) => ({ ...previous, from: event.target.value }))} className={dateInput} />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-2 block">{t("history.to")}</span>
          <input type="date" value={filters.to} onChange={(event) => setFilters((previous) => ({ ...previous, to: event.target.value }))} className={dateInput} />
        </label>
        <Button type="submit" className="h-11 py-0">
          {t("history.apply")}
        </Button>
      </form>
      {state.error && <ErrorState message={state.error} onRetry={load} />}
      {state.loading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-200/60" />
          ))}
        </div>
      ) : (
        !state.error &&
        (state.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">{t("history.empty")}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">{t("history.showing", { from: first, to: first + state.items.length - 1, total: state.total })}</p>
            <HistoryTable items={state.items} onOpen={setOpen} />
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-surface p-2 shadow-sm lg:hidden">
              {state.items.map((item, index) => (
                <TransactionLine key={`${item.rrn}-${index}`} item={item} onOpen={setOpen} />
              ))}
            </ul>
          </>
        ))
      )}
      {state.total > LIMIT && (
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <button type="button" disabled={page <= 1 || state.loading} onClick={() => setPage((value) => value - 1)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink disabled:invisible">
            {t("history.prev")}
          </button>
          <span className="text-slate-500">{t("history.page", { page, pages })}</span>
          <button type="button" disabled={page >= pages || state.loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl px-4 py-2 font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink disabled:invisible">
            {t("history.next")}
          </button>
        </div>
      )}
      <TransactionDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
