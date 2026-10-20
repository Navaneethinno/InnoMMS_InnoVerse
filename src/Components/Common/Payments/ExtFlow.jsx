import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Check, Clock, Smartphone, XCircle } from "lucide-react";
import Button from "@/Components/Common/Button";
import CopyButton from "@/Components/Common/CopyButton";
import DetailRow from "@/Components/Common/DetailRow";
import ErrorState from "@/Components/Common/ErrorState";
import FitText from "@/Components/Common/FitText";
import LoadingState from "@/Components/Common/LoadingState";
import PageTitle from "@/Components/Common/PageTitle";
import TextField from "@/Components/Common/TextField";
import LimitsList from "@/Components/Common/Payments/LimitsList";
import PosReceipt from "@/Components/Common/Payments/PosReceipt";
import { TransactionPinNotice } from "@/Components/Common/Payments/TransactionPinSetup";
import WalletPanel from "@/Components/Common/Payments/WalletPanel";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { useExtOrderTracking } from "@/Hooks/Account/useExtOrderTracking";
import { useWalletChanged } from "@/Services/api/liveUpdates";
import {
  loadExtProviders,
  loadWallets,
  quoteExt,
  sendExt,
} from "@/Services/Account/account.api";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import { isStaff, sendableWallets } from "@/Utils/Lib/roles";

// The steps every payment to an outside provider shares (mobile money, bank
// transfer, airtime, CREDELEC, bills), laid out as Send is: the form on the
// left, the wallet it pays from (with its limits) on the right. The page
// draws its own fields and gives the request; this does the wallet, the live
// fee, confirm, PIN, account/send (one client_reference per attempt, reused on
// a retry, so nothing is charged twice) and the outcome, following a PENDING
// order until it settles.
//
//   request   the fields for quote and send, with txn_type and amount
//   ready     whether the request is complete enough to quote
//   lines     (quote) => [[label, value]] for the confirm screen
//   extra     (done, details) => what the done screen adds ("save this meter")
//   actions   the header's controls on the first step
//   switcher  the page's choice (a ModeSwitch), under the title on the first step
//   credit    money comes in (a top-up): totals are "You receive"
//   texts     { submit, pendingTitle, pendingHint, failedTitle, failedHint } to
//             override the wording of the steps
export default function ExtFlow({
  title,
  switcher,
  subtitle,
  actions,
  featureKey,
  providers,
  providersProblem,
  request,
  ready,
  children,
  lines,
  extra,
  onReset,
  noFee,
  credit,
  texts = {},
}) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const [wallets, setWallets] = useState(null);
  const [from, setFrom] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const tracking = useExtOrderTracking(done);
  const key = JSON.stringify(request ?? {});

  const refreshWallets = () =>
    loadWallets()
      .then((list) => setWallets(sendableWallets(list, user)))
      .catch(() => setWallets([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void refreshWallets(), [user]);
  useWalletChanged(refreshWallets);

  // Only wallets in a currency the providers use (MZN).
  const currencies = new Set(
    (providers ?? []).map((p) => p.currency_code).filter(Boolean),
  );
  const usable = (wallets ?? []).filter(
    (w) => !currencies.size || currencies.has(w.currency_code),
  );
  const wallet = usable.find((w) => w.acct_num === from) ?? usable[0];
  const fromAcctNum = usable.length > 1 ? wallet?.acct_num : "";
  const body = () => ({
    ...request,
    ...(fromAcctNum ? { from_acct_num: fromAcctNum } : {}),
  });

  // The fee, asked again as the request changes.
  useEffect(() => {
    if (!ready || quote) {
      if (!ready) setPreview(null);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      quoteExt(body())
        .then((next) => !cancelled && setPreview(next))
        .catch(() => !cancelled && setPreview(null));
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, fromAcctNum, quote]);

  const reset = () => {
    setQuote(null);
    setPreview(null);
    setDone(null);
    tracking.reset();
    setPin("");
    setNote("");
    setProblem("");
    reference.current = null;
    onReset?.();
  };

  const requote = () => quoteExt({ ...body(), verify_recipient: true });
  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      setQuote(await requote());
      reference.current = newReference();
      setPin("");
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const result = await sendExt(request, {
        fromAcctNum,
        note: note.trim(),
        clientReference: reference.current,
        expectedCharge: quote.fee?.total_charge,
        pin: quote.pin_required === false ? "" : pin,
      });
      setDone(result ?? {});
    } catch (error) {
      setProblem(error.message);
      if (error.errorCode === "txn.quote_changed") {
        // The fee changed (nothing moved): the new figures, as a new attempt.
        try {
          setQuote(await requote());
          reference.current = newReference();
        } catch {
          setQuote(null);
        }
      }
      // Otherwise the same reference is kept: sending again can't charge twice.
    } finally {
      setPin("");
      setPending(false);
    }
  };

  const money = (value, q = quote ?? preview) =>
    formatMoney(value, q?.currency_code ?? wallet?.currency_code);
  const totalLabel = credit ? t("ext.netIn") : t("ext.totalOut");
  const totalOf = (q) => (credit ? q.net_credit : (q.total_debit ?? q.amount));
  const step = done ? "done" : quote ? "confirm" : "form";
  // The page's choice (send or top up) sits under the title on the first
  // step; once a payment is under way the title says enough.
  const heading = (
    <>
      <PageTitle
        title={title}
        subtitle={subtitle}
        actions={step === "form" ? actions : null}
      />
      {step === "form" && switcher}
    </>
  );
  const errorBox = problem && (
    <div className="mb-5 max-w-6xl">
      <ErrorState message={problem} />
    </div>
  );
  const blocked = (message) => (
    <div>
      {heading}
      <div className="max-w-6xl">
        <ErrorState message={message} />
      </div>
    </div>
  );

  if (isStaff(user))
    return blocked(
      t("ext.ownerOnlyAll", {
        defaultValue: "Only the merchant owner can do this.",
      }),
    );
  if (featureKey && user?.features?.[featureKey] === false)
    return blocked(
      t("ext.unavailable", { defaultValue: "This isn't available right now." }),
    );
  if (!providers || !wallets) return <LoadingState />;
  if (!providers.length && !done)
    return blocked(providersProblem || t("ext.unavailable"));

  if (done) {
    const { order, gaveUp } = tracking;
    const external = {
      ...(quote?.external ?? {}),
      ...(done.external ?? {}),
      ...(order ?? {}),
    };
    const details = {
      ...(done.external?.details ?? {}),
      ...(order?.details ?? {}),
    };
    const status = order?.status ?? external.status ?? "SUCCESS";
    const receipt = tracking.receipt ?? done.receipt;
    const rrn = order?.rrn ?? done.rrn;
    const name = external.provider_name ?? "";
    const doneActions = (
      <>
        <Button onClick={reset}>
          {t("ext.another", { defaultValue: "New payment" })}
        </Button>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-semibold text-ink hover:bg-slate-50"
        >
          {t("send.viewHistory")}
        </Link>
      </>
    );
    if (status === "SUCCESS") {
      return (
        <div key="done" className="step-enter space-y-5">
          <ExtDetails details={details} />
          {extra?.(done, details)}
          {receipt ? (
            <PosReceipt
              transaction={receiptToTransaction(receipt, {
                quote,
                user,
                rrn,
                toPhone: external.account,
                note: note.trim(),
              })}
              note={
                done.replayed ? t("send.replayed") : (texts.successNote ?? null)
              }
              className="py-2"
            >
              {doneActions}
            </PosReceipt>
          ) : (
            <StatusCard
              icon={Check}
              title={t("ext.paid", { defaultValue: "Done" })}
              rrn={rrn}
            >
              {doneActions}
            </StatusCard>
          )}
        </div>
      );
    }
    const failed = status === "FAILED";
    const reason = failed
      ? order?.message ||
        t(`ext.error.${order?.error_code}`, {
          provider: name,
          defaultValue: t("ext.error.other", { provider: name }),
        })
      : "";
    const waiting = !failed && !gaveUp;
    const pendingTitle =
      texts.pendingTitle?.(external) ??
      t("ext.processing", { defaultValue: "Processing" });
    const pendingHint =
      texts.pendingHint?.(external, quote) ?? t("ext.inProgressHint");
    return (
      <div key="wait" className="step-enter">
        {heading}
        <StatusCard
          icon={
            failed
              ? XCircle
              : texts.pendingIcon === "phone"
                ? Smartphone
                : Clock
          }
          tone={failed ? "bad" : "good"}
          pulse={waiting}
          title={
            failed
              ? (texts.failedTitle?.(external) ??
                t("ext.notCompleted", {
                  provider: name,
                  defaultValue: "{{provider}} did not complete it",
                }))
              : gaveUp
                ? t("ext.letYouKnow")
                : pendingTitle
          }
          hint={
            failed
              ? `${reason} ${texts.failedHint ?? t("ext.sendFailedHint")}`
              : gaveUp
                ? t("ext.letYouKnowHint")
                : pendingHint
          }
          waiting={waiting}
          rrn={rrn}
        >
          {doneActions}
        </StatusCard>
      </div>
    );
  }

  const panel = (shown) => (
    <WalletPanel
      wallets={shown}
      selected={wallet}
      onSelect={setFrom}
      footer={<LimitsList wallet={wallet} txnType={request?.txn_type} />}
      className="h-auto lg:sticky lg:top-28"
    />
  );
  const card = "rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm";

  if (quote) {
    const needPin = quote.pin_required !== false;
    const holder = quote.external?.account_name;
    return (
      <div key="confirm" className="step-enter">
        {heading}
        {errorBox}
        <div className="max-w-6xl">
          <TransactionPinNotice />
        </div>
        <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
          <form onSubmit={send} className={card}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {t("send.confirm")}
            </p>
            <FitText className="mt-2 font-black tracking-tight text-slate-800">
              {money(quote.amount)}
            </FitText>
            {quote.external?.provider_name && (
              <p className="mt-1 text-sm text-slate-500">
                {quote.external.provider_name}
              </p>
            )}
            <dl className="mt-5">
              {(lines?.(quote) ?? [])
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => (
                  <DetailRow key={label} label={label}>
                    {value}
                  </DetailRow>
                ))}
              {holder && (
                <DetailRow label={t("ext.holder", { defaultValue: "Name" })}>
                  {holder}
                </DetailRow>
              )}
              <DetailRow label={t("send.fee")}>
                {money(quote.fee?.total_charge ?? 0)}
              </DetailRow>
              <DetailRow label={totalLabel} strong>
                {money(totalOf(quote))}
              </DetailRow>
              {note.trim() && (
                <DetailRow label={t("ext.purpose")}>{note.trim()}</DetailRow>
              )}
            </dl>
            {texts.confirmHint && (
              <p className="mt-3 text-xs text-slate-500">{texts.confirmHint}</p>
            )}
            {needPin && (
              <div className="mt-5">
                <TextField
                  name="pin"
                  type="password"
                  autoFocus
                  maxLength={pinRules.maxLength}
                  inputMode={pinRules.letters ? undefined : "numeric"}
                  autoComplete="off"
                  label={t("send.enterPin")}
                  value={pin}
                  onChange={(event) =>
                    setPin(sanitizePin(pinRules, event.target.value))
                  }
                />
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setQuote(null)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink"
              >
                {t("send.back")}
              </button>
              <Button
                type="submit"
                pending={pending}
                disabled={needPin && pin.length < pinRules.entryMin}
                className="px-8"
              >
                {texts.submit ?? t("ext.payNow", { defaultValue: "Pay" })}
              </Button>
            </div>
          </form>
          {wallet && panel([wallet])}
        </div>
      </div>
    );
  }

  return (
    <div key="form" className="step-enter">
      {heading}
      {errorBox}
      <div className="max-w-6xl">
        <TransactionPinNotice />
      </div>
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
        <form onSubmit={review} className={`${card} min-w-0 space-y-5`}>
          {children}
          <TextField
            name="note"
            label={t("ext.purposeOptional", {
              defaultValue: "Note (optional)",
            })}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {ready && preview && (
            <dl className="rounded-2xl bg-ink/5 px-4">
              {!noFee && (
                <DetailRow label={t("send.fee")}>
                  {money(preview.fee?.total_charge ?? 0, preview)}
                </DetailRow>
              )}
              <DetailRow label={totalLabel} strong>
                {money(totalOf(preview), preview)}
              </DetailRow>
            </dl>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              pending={pending}
              disabled={!ready}
              className="px-8"
            >
              {t("send.review")}
            </Button>
          </div>
        </form>
        {usable.length > 0 && panel(usable)}
      </div>
    </div>
  );
}

// The outcome when there is no slip to print: done, in progress, failed.
function StatusCard({
  icon,
  tone = "good",
  pulse,
  title,
  hint,
  waiting,
  rrn,
  children,
}) {
  const Icon = icon;
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-surface p-8 text-center shadow-sm">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-md ${tone === "bad" ? "bg-red-500/10 text-red-600" : "brand-gradient text-lime"}`}
      >
        <Icon size={30} className={pulse ? "animate-pulse" : undefined} />
      </span>
      <p className="mt-5 text-xl font-black text-slate-800">{title}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {hint}
        </p>
      )}
      {waiting && (
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="h-2 w-2 animate-ping rounded-full bg-ink" />
          {t("ext.waiting")}
        </p>
      )}
      {rrn && (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          {t("ext.reference", { rrn })}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}

// What the provider returned: a token (CREDELEC, some bills) shown large and
// copyable, then the rest (units, receipt and policy numbers, valid until).
const DETAIL_KEYS = ["units", "receipt_no", "policy_no", "valid_until"];
export function ExtDetails({ details }) {
  const { t } = useTranslation();
  if (!details || !Object.keys(details).length) return null;
  const token = details.token;
  const units =
    details.units != null
      ? `${details.units} ${details.units_name ?? ""}`.trim()
      : null;
  const rows = DETAIL_KEYS.map((k) => [
    k,
    k === "units" ? units : details[k],
  ]).filter(([, v]) => v != null && v !== "");
  if (!token && !rows.length) return null;
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
      {token && (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("ext.token", { defaultValue: "Token" })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-black tracking-wider text-slate-800 [overflow-wrap:anywhere] sm:text-3xl">
              {groupDigits(token)}
            </p>
            <CopyButton
              value={String(token).replace(/\s/g, "")}
              label={t("ext.copy")}
            />
          </div>
        </>
      )}
      {rows.length > 0 && (
        <dl className={token ? "mt-4" : ""}>
          {rows.map(([k, v]) => (
            <DetailRow key={k} label={t(`ext.detail.${k}`)}>
              {v}
            </DetailRow>
          ))}
        </dl>
      )}
    </div>
  );
}

// 20-digit tokens read in groups of four.
const groupDigits = (value) => {
  const text = String(value);
  return /^\d{8,}$/.test(text) ? text.replace(/(\d{4})(?=\d)/g, "$1 ") : text;
};

// A details line (the shared DetailRow), for the pages' own summaries.
export const Line = DetailRow;

// Choices as chips (providers, categories, amounts), for short lists.
// `highlight` marks one without choosing it (the provider a number belongs to).
export function Chips({ options, value, onChange, allowNone, highlight }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value || (!value && highlight === o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            disabled={!onChange}
            onClick={() =>
              onChange?.(value === o.value && allowNone ? "" : o.value)
            }
            className={`rounded-full border px-4 py-2 text-sm font-bold transition duration-200 active:scale-95 disabled:cursor-default disabled:active:scale-100 ${on ? "border-forest bg-forest text-white dark:border-lime dark:bg-lime dark:text-on-secondary" : "border-slate-200 text-slate-600 hover:border-ink/40"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The providers of one kind (MOBILE_WALLET, BANK, AIRTIME, ELECTRICITY,
// BILLER); null while loading, [] when the call fails (its message in `problem`).
export function useProviders(kind) {
  const [state, setState] = useState({ list: null, problem: "" });
  useEffect(() => {
    loadExtProviders()
      .then((rows) =>
        setState({
          list: rows.filter((p) => !p.kind || p.kind === kind),
          problem: "",
        }),
      )
      .catch((error) => setState({ list: [], problem: error.message }));
  }, [kind]);
  return state;
}

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
export const cleanAmount = (value) => value.replace(/[^\d.]/g, "");
