import { useWalletChanged } from "@/Services/api/liveUpdates";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowRight, KeyRound, Undo2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import TextField from "@/Components/Common/TextField";
import { loadHistory, loadWallets, quotePayment, sendPayment } from "@/Services/Account/account.api";
import FitText from "@/Components/Common/FitText";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { formatDateTime, formatMoney, newReference } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import LimitsList from "./LimitsList";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import PosReceipt from "./PosReceipt";
import WalletPanel from "./WalletPanel";
import { TransactionPinNotice, useNeedsTransactionPin } from "./TransactionPinSetup";

// Refund a payment the merchant received (MERCHANT_REFUND): pick the payment,
// say how much to return, then form -> quote (the confirmation screen) -> send.
// A merchant does not send money to people: what customers pay arrives by
// itself, and a refund is the only thing sent from here.
//
// The quote says what it will cost; the PIN is asked only when `pin_required`.
// One `client_reference` is made per attempt and reused when retrying, so a
// timeout and a retry can never pay twice.
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function Send() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const needsTxnPin = useNeedsTransactionPin();
  const [wallets, setWallets] = useState(null);
  const [form, setForm] = useState({ from: "", amount: "", note: "" });
  // The payments received that can be refunded, and the one picked.
  const [payments, setPayments] = useState(null);
  const [picked, setPicked] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [paid, setPaid] = useState(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);

  useEffect(() => {
    loadWallets()
      .then(setWallets)
      .catch((error) => {
        setWallets([]);
        setProblem(error.message);
      });
  }, [t]);

  useWalletChanged(() => loadWallets().then(setWallets).catch(() => {}));

  const set = (key) => (event) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };
  const fail = (error) => {
    setProblem(error.message);
    scrollToTop();
  };

  // What customers paid: the lines of money received (credits).
  useEffect(() => {
    loadHistory({ txnType: "MERCHANT_PAYMENT", limit: 50 })
      .then(({ items }) => setPayments(items.filter((item) => item.direction === "CR")))
      .catch((error) => {
        setPayments([]);
        setProblem(error.message);
      });
  }, [t]);
  const pick = (payment) => {
    setPicked(payment);
    setForm((previous) => ({ ...previous, amount: String(payment.amount ?? "") }));
  };

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const next = await quotePayment({ txnType: "MERCHANT_REFUND", orgRrn: picked.rrn, amount: form.amount, fromAcctNum: form.from });
      setQuote(next);
      setPin("");
      reference.current = newReference();
      scrollToTop();
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  };

  const send = async () => {
    setPending(true);
    setProblem("");
    try {
      const done = await sendPayment({
        txnType: "MERCHANT_REFUND",
        orgRrn: picked.rrn,
        amount: form.amount,
        fromAcctNum: form.from,
        clientReference: reference.current,
        pin: quote.pin_required ? pin : "",
        note: form.note.trim(),
      });
      setPaid(done);
      scrollToTop();
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  };

  const again = () => {
    setForm({ from: form.from, amount: "", note: "" });
    setPicked(null);
    setQuote(null);
    setPaid(null);
    setPin("");
    reference.current = null;
  };

  const pinBlocked = user && (user.pinLocked || user.pinSet === false);
  const pinNotice = needsTxnPin ? (
    <TransactionPinNotice />
  ) : (
    pinBlocked && (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/50 bg-surface p-4 text-sm shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
        <KeyRound size={17} />
      </span>
      <span className="min-w-0 flex-1 font-medium text-slate-700">{user.pinLocked ? t("send.pinLocked") : t("send.setPin")}</span>
      <Link to="/security" className="shrink-0 font-bold text-ink underline">
        {t("send.goSecurity")}
      </Link>
    </div>
    )
  );
  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("refund.title", { defaultValue: "Refund a payment" })}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("refund.subtitle", { defaultValue: "Return money to a customer who paid you." })}</p>
    </div>
  );
  const errorBox = problem && (
    <div className="mb-5">
      <ErrorState message={problem} />
    </div>
  );

  if (paid) {
    return (
      <PosReceipt transaction={receiptToTransaction(paid.receipt, { quote, user, rrn: paid.rrn, note: form.note.trim() })} note={paid.replayed ? t("send.replayed") : null} className="py-2">
        <Button onClick={again}>{t("send.again")}</Button>
        <Link to="/history" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-semibold text-ink hover:bg-slate-50">
          {t("send.viewHistory")}
        </Link>
      </PosReceipt>
    );
  }

  if (quote) {
    const fee = quote.fee ?? {};
    // The wallet this pays from, and what is left in it after the payment.
    const payingWallet = wallets?.find((w) => w.acct_num === quote.from?.acct_num) ?? wallets?.[0];
    const available = Number(quote.from?.avail_bal ?? payingWallet?.avail_bal);
    const balanceAfter = Number.isFinite(available) && quote.total_debit != null ? available - Number(quote.total_debit) : null;
    const limits = (quote.limits ?? []).flatMap((group) => (group.limits ?? []).map((limit) => ({ ...limit, side: group.side })));
    return (
      <div>
        {heading}
        <div className="max-w-6xl">
          {errorBox}
          {pinNotice}
        </div>
        <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending && !(quote.pin_required && pin.length < pinRules.entryMin)) void send();
          }}
          className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("send.confirm")}</p>
          <FitText className="mt-2 font-black tracking-tight text-slate-800">{formatMoney(quote.amount, quote.currency_code)}</FitText>
          <p className="mt-1 text-sm text-slate-500">
            {quote.txn_type_name}{quote.to?.name ? ` · ${quote.to.name}` : ""}
          </p>
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.from")}</dt>
              <dd className="text-right text-slate-800">{quote.from?.name} · {quote.from?.acct_num}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.to")}</dt>
              <dd className="text-right text-slate-800">{quote.to?.name ?? quote.to?.acct_num}</dd>
            </div>
            {/* A fee the other party pays (a merchant's discount) is not the customer's. */}
            {fee.total_charge != null && Number(fee.total_charge) !== 0 && fee.pay_from !== "RECEIVER" && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">{fee.fee_name ?? t("send.fee")}</dt>
                <dd className="text-slate-800">{formatMoney(fee.total_charge, quote.currency_code)}</dd>
              </div>
            )}
            <div className="flex justify-between py-2 font-bold">
              <dt className="text-slate-700">{t("send.total")}</dt>
              <dd className="text-slate-800">{formatMoney(quote.total_debit, quote.currency_code)}</dd>
            </div>
            {quote.net_credit && quote.to?.party !== "MERCHANT" && (
              <div className="flex justify-between py-2">
                <dt className="text-slate-500">{t("send.theyGet")}</dt>
                <dd className="text-slate-800">{formatMoney(quote.net_credit, quote.currency_code)}</dd>
              </div>
            )}
          </dl>
          {limits.some((limit) => limit.left_count != null || limit.left_amount != null) && (
            <ul className="mt-3 space-y-0.5 text-xs text-slate-500">
              {limits
                .filter((limit) => limit.left_count != null || limit.left_amount != null)
                .map((limit, index) => (
                  <li key={index}>
                    {limit.limit_type?.replaceAll("_", " ").toLowerCase()}:{" "}
                    {limit.left_amount != null ? t("send.limitLeftAmount", { amount: formatMoney(limit.left_amount, quote.currency_code) }) : t("send.limitLeft", { count: limit.left_count })}
                  </li>
                ))}
            </ul>
          )}
          {quote.pin_required && (
            <div className="mt-5">
              <TextField
                name="pin"
                type="password"
                maxLength={pinRules.maxLength}
                inputMode={pinRules.letters ? undefined : "numeric"}
                autoComplete="off"
                label={t("send.enterPin")}
                value={pin}
                onChange={(event) => setPin(sanitizePin(pinRules, event.target.value))}
              />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setQuote(null)} disabled={pending} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink">
              {t("send.back")}
            </button>
            <Button type="submit" pending={pending} disabled={quote.pin_required && pin.length < pinRules.entryMin} className="px-8">
              {t("send.send")}
              {!pending && <ArrowRight size={16} />}
            </Button>
          </div>
        </form>
        {/* What the payment does to the wallet, and what is left of the limits. */}
        <WalletPanel
          wallets={wallets}
          selected={payingWallet}
          className="order-first h-auto lg:order-none"
          footer={
            <>
              {balanceAfter != null && (
                <div className="mt-4 rounded-2xl bg-ink/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("send.balanceAfter", { defaultValue: "Balance after this payment" })}</p>
                  <FitText className="mt-1 font-black tracking-tight text-slate-800">{formatMoney(balanceAfter, quote.currency_code)}</FitText>
                </div>
              )}
              <LimitsList wallet={payingWallet} txnType={quote.txn_type} />
            </>
          }
          onSelect={() => {}}
        />
        </div>
      </div>
    );
  }

  // The wallet money leaves from: the merchant's pick, else the one in the
  // payee's currency (what the server would use), else the first.
  const selectedWallet = wallets?.find((w) => w.acct_num === form.from) ?? wallets?.find((w) => w.currency_code === picked?.currency_code) ?? wallets?.[0];
  return (
    <div>
      {heading}
      <div className="max-w-6xl">
      {errorBox}
      {pinNotice}
      {wallets && wallets.length === 0 && !problem && <p className="mb-5 text-sm text-slate-500">{t("send.noWallets")}</p>}
      </div>
      <div className="grid max-w-6xl items-stretch gap-6 lg:grid-cols-2">
      <div className="min-w-0">
      <form noValidate onSubmit={review} className="h-full space-y-5 rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
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
                    onClick={() => pick(payment)}
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
        <TextField name="amount" label={t("send.amount")} inputMode="decimal" autoComplete="off" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value.replace(/[^\d.]/g, "") }))} />
        <TextField name="note" label={t("send.note")} maxLength={255} autoComplete="off" value={form.note} onChange={set("note")} />
        <Button type="submit" pending={pending} disabled={!picked || !Number(form.amount)} className="w-full">
          {t("send.review")}
          {!pending && <ArrowRight size={16} />}
        </Button>
      </form>
      </div>
      {/* On a phone the wallet comes first, on a wide screen it sits beside the form. */}
      <WalletPanel wallets={wallets} selected={selectedWallet} footer={<LimitsList wallet={selectedWallet} txnType="MERCHANT_REFUND" />} onSelect={(acctNum) => setForm((previous) => ({ ...previous, from: acctNum }))} className="order-first lg:order-none" />
      </div>
    </div>
  );
}
