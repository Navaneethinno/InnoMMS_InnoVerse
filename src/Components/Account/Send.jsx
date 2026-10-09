import { useWalletChanged } from "@/Services/api/liveUpdates";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowRight, Info, KeyRound, Store, UserRound } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { checkPayee, loadWallets, quotePayment, sendPayment } from "@/Services/Account/account.api";
import FitText from "@/Components/Common/FitText";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { rememberPayee } from "@/Utils/Lib/recentPayees";
import LimitsList from "./LimitsList";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import PosReceipt from "./PosReceipt";
import PhoneTransfers from "./PhoneTransfers";
import RecentPayees from "./RecentPayees";
import RefundPicker from "./RefundPicker";
import WalletPanel from "./WalletPanel";
import { TransactionPinNotice, useNeedsTransactionPin } from "./TransactionPinSetup";
import { isStaff, sendableWallets } from "@/Utils/Lib/roles";

// Money out of the merchant's wallet, two ways:
//  - "send": to a person by their number (P2P_TRANSFER). A number with no
//    account can still be paid: the quote comes back as P2P_TO_PHONE and the
//    money waits for them (listed below the form, where it can be taken back).
//    Merchants pay people only: a number that belongs to a merchant is refused.
//  - "refund": back to a customer who paid (MERCHANT_REFUND), naming the
//    payment (`org_rrn`). History's "Refund" opens this with ?refund=<rrn>.
// Both go form -> quote (the confirmation screen) -> send. The PIN is asked
// only when `pin_required`. One `client_reference` is made per attempt and
// reused when retrying, so a timeout and a retry can never pay twice.
const refundableOf = (payment) => payment?.refundable ?? payment?.amount;
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function Send() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const portalPolicy = usePortalPolicy();
  const needsTxnPin = useNeedsTransactionPin();
  const [searchParams, setSearchParams] = useSearchParams();
  const refundRrn = searchParams.get("refund");
  // A store manager may only refund payments made at its stores (handoff, phase 5).
  const refundOnly = isStaff(user);
  const [mode, setMode] = useState(refundRrn || refundOnly ? "refund" : "send");
  const [allWallets, setAllWallets] = useState(null);
  // Sending and refunds use the merchant's own money only: the agent wallet and
  // an owner's store wallets are refused here (portal.wallet_unknown).
  const wallets = allWallets && sendableWallets(allWallets, user);
  const [form, setForm] = useState({ from: "", to: "", amount: "", note: "" });
  const [payee, setPayee] = useState(null);
  const [checking, setChecking] = useState(false);
  // A number with no account yet: it can still be paid, the money waits.
  const [unknown, setUnknown] = useState(false);
  const [transfersVersion, setTransfersVersion] = useState(0);
  // The payment being refunded (RefundPicker lists them).
  const [picked, setPicked] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [paid, setPaid] = useState(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const refunding = mode === "refund";

  useEffect(() => {
    loadWallets()
      .then((list) => setAllWallets(list))
      .catch((error) => {
        setAllWallets([]);
        setProblem(error.message);
      });
  }, [t]);

  useWalletChanged(() => loadWallets().then((list) => setAllWallets(list)).catch(() => {}));

  const set = (key) => (event) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };
  const fail = (error) => {
    setProblem(error.message);
    scrollToTop();
  };

  // The number is checked on its own once it looks complete: who it is (the
  // name comes masked), or that no account has it yet.
  const number = form.to.trim();
  useEffect(() => {
    setPayee(null);
    setUnknown(false);
    if (refunding || number.replace(/\D/g, "").length < 7) return undefined;
    let live = true;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const found = await checkPayee(number);
        if (live) {
          setPayee(found);
          setProblem("");
        }
      } catch (error) {
        if (!live) return;
        if (error.errorCode === "portal.payee_unknown") setUnknown(true);
        else fail(error);
      } finally {
        if (live) setChecking(false);
      }
    }, 600);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [number, refunding]);
  // Merchants send to people only: the server refuses a merchant's number.
  const payeeIsMerchant = payee?.party === "MERCHANT";

  // Picking fills in the whole amount; it can be lowered for a part refund.
  // null goes back to the list.
  const pick = useCallback((payment) => {
    setPicked(payment);
    setForm((previous) => ({ ...previous, amount: payment ? String(refundableOf(payment) ?? "") : "" }));
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setProblem("");
    setPicked(null);
    setForm((previous) => ({ from: previous.from, to: "", amount: "", note: "" }));
    if (refundRrn) setSearchParams({}, { replace: true });
  };

  // Who the money goes to: a payment to refund, or a number. (The wallet
  // number a lookup gives back is masked: it is never sent.)
  const target = () => (refunding ? { txnType: "MERCHANT_REFUND", orgRrn: picked.rrn } : { txnType: "P2P_TRANSFER", toPhone: number });

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const next = await quotePayment({ ...target(), amount: form.amount, fromAcctNum: form.from });
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
        ...target(),
        amount: form.amount,
        fromAcctNum: form.from,
        clientReference: reference.current,
        expectedCharge: quote.fee?.total_charge,
        pin: quote.pin_required ? pin : "",
        note: form.note.trim(),
      });
      setPaid(done);
      if (!refunding) {
        rememberPayee(number);
        setTransfersVersion((v) => v + 1);
      }
      scrollToTop();
    } catch (error) {
      fail(error);
      // The fee changed since the quote (nothing was posted): show the new
      // figures, with the API's message naming the new charge, as a new attempt.
      if (error.errorCode === "txn.quote_changed") {
        try {
          setQuote(await quotePayment({ ...target(), amount: form.amount, fromAcctNum: form.from }));
          setPin("");
          reference.current = newReference();
        } catch {
          setQuote(null);
        }
      }
    } finally {
      setPending(false);
    }
  };

  const again = () => {
    setForm({ from: form.from, to: "", amount: "", note: "" });
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{refunding ? t("refund.title", { defaultValue: "Refund a payment" }) : t("send.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{refunding ? t("refund.subtitle", { defaultValue: "Return money to a customer who paid you." }) : t("send.subtitle")}</p>
      </div>
      {!quote && !paid && !refundOnly && (
        <SegmentedTabs
          items={[
            { key: "send", label: t("send.modeSend", { defaultValue: "Send money" }) },
            { key: "refund", label: t("send.modeRefund", { defaultValue: "Refund" }) },
          ]}
          value={mode}
          onChange={switchMode}
        />
      )}
    </div>
  );
  const errorBox = problem && (
    <div className="mb-5">
      <ErrorState message={problem} />
    </div>
  );

  if (paid) {
    const waiting = !refunding && !paid.to;
    return (
      <PosReceipt
        transaction={receiptToTransaction(paid.receipt, { quote, user, rrn: paid.rrn, toPhone: waiting ? paid.to_phone : undefined, note: form.note.trim() })}
        note={paid.replayed ? t("send.replayed") : waiting ? t("send.waitingDone", { defaultValue: "Sent to {{phone}}. They will get it when they join.", phone: paid.to_phone }) : null}
        className="py-2"
      >
        <Button onClick={again}>{refunding ? t("refund.again", { defaultValue: "Refund another" }) : t("send.again")}</Button>
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
    // A number not on e-taku yet: P2P_TO_PHONE, no `to`.
    const toPhone = !quote.to && quote.txn_type !== "MERCHANT_REFUND";
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
            {quote.txn_type_name} · {quote.to?.name ?? quote.to_phone ?? picked?.counterparty_name}
          </p>
          {toPhone && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2.5 text-sm text-ink">
              <Info size={16} className="mt-0.5 shrink-0" />
              {t("send.waitingConfirm", { phone: quote.to_phone })}
            </p>
          )}
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.from")}</dt>
              <dd className="text-right text-slate-800">{quote.from?.name} · {quote.from?.acct_num}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{toPhone ? t("onb.mobile") : t("send.to")}</dt>
              <dd className="text-right text-slate-800">{toPhone ? quote.to_phone : quote.to?.acct_num ?? quote.to?.name ?? picked?.counterparty_name}</dd>
            </div>
            {/* A fee the other party pays is not the merchant's. */}
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
            {quote.net_credit && (
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
  // payee's (or the payment's) currency, else the first.
  const currency = refunding ? picked?.currency_code : payee?.currency_code;
  const selectedWallet = wallets?.find((w) => w.acct_num === form.from) ?? wallets?.find((w) => w.currency_code === currency) ?? wallets?.[0];
  // A refund returns at most what was paid.
  // A refund returns at most what is still refundable (the payment less its
  // earlier refunds: `refundable`), else the whole payment.
  const refundMax = picked ? refundableOf(picked) : null;
  const overRefund = refunding && picked && Number(form.amount) > Number(refundMax);
  // A store manager's own limit: above it the merchant must refund.
  const staffLimit = refundOnly && user?.staff?.refund_limit != null ? Number(user.staff.refund_limit) : null;
  const overLimit = staffLimit != null && Number(form.amount) > staffLimit;
  const ready = refunding ? Boolean(picked) && !overRefund && !overLimit : (payee || unknown) && !checking && !payeeIsMerchant;
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
        {refunding ? (
          <RefundPicker picked={picked} onPick={pick} preselectRrn={refundRrn} />
        ) : (
          <div className="space-y-4">
            <RecentPayees onPick={(phone) => setForm((previous) => ({ ...previous, to: phone }))} />
            <div>
              <PhoneField
                name="to"
                label={t("onb.mobile")}
                countries={portalPolicy.phone.countries}
                value={form.to}
                onChange={(value) => setForm((previous) => ({ ...previous, to: value }))}
              />
              {checking && <p className="mt-2 text-xs text-slate-500">{t("send.checking", { defaultValue: "Checking the number…" })}</p>}
              {unknown && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink">
                  <Info size={15} className="mt-0.5 shrink-0" />
                  {t("send.noAccount")}
                </p>
              )}
              {payee && (
                <p className="mt-2 flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold text-ink">
                  {payeeIsMerchant ? <Store size={15} /> : <UserRound size={15} />}
                  {payee.name}
                  <span className="ml-auto text-xs font-normal text-slate-500">{payeeIsMerchant ? t("send.merchant") : payee.currency_code}</span>
                </p>
              )}
              {payeeIsMerchant && <p className="mt-2 text-sm text-red-600">{t("send.peopleOnly", { defaultValue: "Merchants can send money to people only." })}</p>}
            </div>
          </div>
        )}
        <div>
          <TextField
            name="amount"
            label={t("send.amount")}
            inputMode="decimal"
            autoComplete="off"
            value={form.amount}
            error={
              overRefund
                ? t("refund.tooMuch", { amount: formatMoney(refundMax, picked.currency_code) })
                : overLimit
                  ? t("refund.overLimit", { amount: formatMoney(staffLimit, picked?.currency_code), defaultValue: "Your refund limit is {{amount}}. Larger refunds need the merchant." })
                  : undefined
            }
            onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value.replace(/[^\d.]/g, "") }))}
          />
          {refunding && picked && Number(form.amount) !== Number(refundMax) && !overRefund && (
            <button type="button" onClick={() => setForm((previous) => ({ ...previous, amount: String(refundMax) }))} className="mt-2 text-xs font-bold text-ink underline-offset-2 hover:underline">
              {t("refund.full", { amount: formatMoney(refundMax, picked.currency_code) })}
            </button>
          )}
        </div>
        <TextField name="note" label={t("send.note")} maxLength={255} autoComplete="off" value={form.note} onChange={set("note")} />
        <Button type="submit" pending={pending} disabled={!ready || !Number(form.amount)} className="w-full">
          {t("send.review")}
          {!pending && <ArrowRight size={16} />}
        </Button>
      </form>
      </div>
      {/* On a phone the wallet comes first when sending (a refund starts from the
          payment), on a wide screen it sits beside the form. */}
      <WalletPanel wallets={wallets} selected={selectedWallet} footer={<LimitsList wallet={selectedWallet} txnType={refunding ? "MERCHANT_REFUND" : "P2P_TRANSFER"} />} onSelect={(acctNum) => setForm((previous) => ({ ...previous, from: acctNum }))} className={refunding ? undefined : "order-first lg:order-none"} />
      </div>
      {!refunding && <PhoneTransfers version={transfersVersion} onCancelled={() => loadWallets().then((list) => setAllWallets(list)).catch(() => {})} className="max-w-6xl" />}
    </div>
  );
}
