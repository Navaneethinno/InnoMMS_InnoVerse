import { useWalletChanged } from "@/Services/api/liveUpdates";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowRight, Info, KeyRound, Store, UserRound } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import PhoneField from "@/Components/Common/PhoneField";
import TextField from "@/Components/Common/TextField";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { checkPayee, loadWallets, quotePayment, sendPayment } from "@/Services/Account/account.api";
import FitText from "@/Components/Common/FitText";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import LimitsList from "./LimitsList";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import PosReceipt from "./PosReceipt";
import PhoneTransfers from "./PhoneTransfers";
import WalletPanel from "./WalletPanel";
import { TransactionPinNotice, useNeedsTransactionPin } from "./TransactionPinSetup";

// Send money to another customer's wallet (P2P_TRANSFER) or pay a merchant
// (MERCHANT_PAYMENT):  form -> quote (the confirmation screen) -> send.
//
// The payee's name is shown before paying. The quote says what it will cost;
// the PIN is asked only when `pin_required`. One `client_reference` is made
// per payment attempt and reused when retrying, so a timeout and a retry can
// never pay twice.
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function Send() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const portalPolicy = usePortalPolicy();
  const needsTxnPin = useNeedsTransactionPin();
  const [wallets, setWallets] = useState(null);
  const [form, setForm] = useState({ from: "", to: "", amount: "", note: "" });
  const [payee, setPayee] = useState(null);
  const [checking, setChecking] = useState(false);
  // A number with no account yet: it can still be paid, the money waits.
  const [unknown, setUnknown] = useState(false);
  const [transfersVersion, setTransfersVersion] = useState(0);
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

  // Only for the limits shown beside the wallet. Everyone is paid by their number
  // with P2P_TRANSFER: the server works out a customer, a merchant, or a number
  // with no account, and the quote says which (shown on the confirm screen).
  const txnType = payee?.party === "MERCHANT" ? "MERCHANT_PAYMENT" : "P2P_TRANSFER";
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
    if (number.replace(/\D/g, "").length < 7) return undefined;
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
  }, [number]);
  // (The wallet number a lookup gives back is masked: it is never sent.)
  const recipient = { toPhone: number };

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const next = await quotePayment({ txnType: "P2P_TRANSFER", ...recipient, amount: form.amount, fromAcctNum: form.from });
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
        txnType: "P2P_TRANSFER",
        ...recipient,
        amount: form.amount,
        fromAcctNum: form.from,
        clientReference: reference.current,
        pin: quote.pin_required ? pin : "",
        note: form.note.trim(),
      });
      setPaid(done);
      setTransfersVersion((v) => v + 1);
      scrollToTop();
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  };

  const again = () => {
    setForm({ from: form.from, to: "", amount: "", note: "" });
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
      <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("send.title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t("send.subtitle")}</p>
    </div>
  );
  const errorBox = problem && (
    <div className="mb-5">
      <ErrorState message={problem} />
    </div>
  );

  if (paid) {
    return (
      <PosReceipt transaction={receiptToTransaction(paid.receipt, { quote, user, rrn: paid.rrn, toPhone: paid.to ? undefined : paid.to_phone, note: form.note.trim() })} note={paid.replayed ? t("send.replayed") : paid.to ? null : t("send.waitingDone", { defaultValue: "Sent to {{phone}}. They will get it when they join.", phone: paid.to_phone })} className="py-2">
        <Button onClick={again}>{t("send.again")}</Button>
        <Link to="/history" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-semibold text-ink hover:bg-slate-50">
          {t("send.viewHistory")}
        </Link>
      </PosReceipt>
    );
  }

  if (quote) {
    const fee = quote.fee ?? {};
    const limits = (quote.limits ?? []).flatMap((group) => (group.limits ?? []).map((limit) => ({ ...limit, side: group.side })));
    return (
      <div className="max-w-xl">
        {heading}
        {errorBox}
        {pinNotice}
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
            {quote.to?.party === "MERCHANT" ? t("send.payTo", { defaultValue: "Pay {{name}}", name: quote.to.name }) : `${quote.txn_type_name} · ${quote.to?.name ?? quote.to_phone}`}
          </p>
          {!quote.to && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink/5 px-3 py-2.5 text-sm text-ink">
              <Info size={16} className="mt-0.5 shrink-0" />
              {t("send.waitingConfirm", { defaultValue: "{{phone}} does not have an account yet. The money will wait for them and reach them when they join.", phone: quote.to_phone })}
            </p>
          )}
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{t("send.from")}</dt>
              <dd className="text-right text-slate-800">{quote.from?.name} · {quote.from?.acct_num}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{quote.to ? t("send.to") : t("onb.mobile")}</dt>
              <dd className="text-right text-slate-800">{quote.to?.acct_num ?? quote.to_phone}</dd>
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
      </div>
    );
  }

  // The wallet money leaves from: the customer's pick, else the one in the
  // payee's currency (what the server would use), else the first.
  const selectedWallet = wallets?.find((w) => w.acct_num === form.from) ?? wallets?.find((w) => w.currency_code === payee?.currency_code) ?? wallets?.[0];
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
              {t("send.noAccount", { defaultValue: "No account has this number yet. You can still send: the money waits for them until they join." })}
            </p>
          )}
          {payee && (
            <p className="mt-2 flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm font-semibold text-ink">
              {payee.party === "MERCHANT" ? <Store size={15} /> : <UserRound size={15} />}
              {payee.name}
              <span className="ml-auto text-xs font-normal text-slate-500">{payee.party === "MERCHANT" ? t("send.merchant") : payee.currency_code}</span>
            </p>
          )}
        </div>
        <TextField name="amount" label={t("send.amount")} inputMode="decimal" autoComplete="off" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value.replace(/[^\d.]/g, "") }))} />
        <TextField name="note" label={t("send.note")} maxLength={255} autoComplete="off" value={form.note} onChange={set("note")} />
        <Button type="submit" pending={pending} disabled={!(payee || unknown) || checking || !Number(form.amount)} className="w-full">
          {t("send.review")}
          {!pending && <ArrowRight size={16} />}
        </Button>
      </form>
      </div>
      {/* On a phone the wallet comes first, on a wide screen it sits beside the form. */}
      <WalletPanel wallets={wallets} selected={selectedWallet} footer={<LimitsList wallet={selectedWallet} txnType={txnType} />} onSelect={(acctNum) => setForm((previous) => ({ ...previous, from: acctNum }))} className="order-first lg:order-none" />
      </div>
      <PhoneTransfers version={transfersVersion} onCancelled={() => loadWallets().then(setWallets).catch(() => {})} className="max-w-6xl" />
    </div>
  );
}
