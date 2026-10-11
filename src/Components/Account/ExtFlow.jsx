import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Check, Clock, Copy, XCircle } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import FitText from "@/Components/Common/FitText";
import LoadingState from "@/Components/Common/LoadingState";
import TextField from "@/Components/Common/TextField";
import PosReceipt from "@/Components/Account/PosReceipt";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { useExtOrder, useWalletChanged } from "@/Services/api/liveUpdates";
import {
  loadExtOrder,
  loadExtProviders,
  loadWallets,
  quoteExt,
  sendExt,
} from "@/Services/Account/account.api";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import { isStaff, sendableWallets } from "@/Utils/Lib/roles";

// The steps every payment to an outside provider shares (bank transfer,
// airtime, CREDELEC, bills): the page draws its own fields and gives the
// request; this does the wallet, the live fee, confirm, PIN, account/send (one
// client_reference per attempt, reused on a retry) and the outcome, following a
// PENDING order on the live channel (and account/ext_order) until it settles.
//
//   request   the fields for quote and send, with txn_type and amount
//   ready     whether the request is complete enough to quote
//   lines     (quote) => [[label, value]] for the confirm screen
//   extra     (done, details) => what the done screen adds (e.g. "save this meter")
const WAIT_MS = 3 * 60 * 1000;
const POLL_MS = 15000;

export default function ExtFlow({
  title,
  subtitle,
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
}) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const [wallets, setWallets] = useState([]);
  const [from, setFrom] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  const [order, setOrder] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const key = JSON.stringify(request ?? {});

  const refreshWallets = () =>
    loadWallets()
      .then((list) => setWallets(sendableWallets(list, user)))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void refreshWallets(), [user]);
  useWalletChanged(refreshWallets);

  // Only wallets in a currency the providers use (MZN).
  const currencies = new Set(
    (providers ?? []).map((p) => p.currency_code).filter(Boolean),
  );
  const usable = currencies.size
    ? wallets.filter((w) => currencies.has(w.currency_code))
    : wallets;

  const orderRef = done?.external?.order_ref;
  const open =
    Boolean(done) &&
    !order &&
    (done.external?.status ?? "SUCCESS") === "PENDING";
  const settle = (next) => {
    if (!next || next.status === "PENDING") return;
    setOrder(next);
    if (next.status === "FAILED" && !next.message && next.order_ref)
      loadExtOrder(next.order_ref)
        .then(
          (full) =>
            full?.message && setOrder((o) => ({ ...o, message: full.message })),
        )
        .catch(() => {});
  };
  useExtOrder((detail) => {
    if (
      open &&
      ((orderRef && detail?.order_ref === orderRef) ||
        (done.rrn && detail?.rrn === done.rrn))
    )
      settle(detail);
  });
  useEffect(() => {
    if (!open || !orderRef) return undefined;
    const poll = window.setInterval(
      () =>
        loadExtOrder(orderRef)
          .then(settle)
          .catch(() => {}),
      POLL_MS,
    );
    const stop = window.setTimeout(() => setGaveUp(true), WAIT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
     
  }, [open, orderRef]);

  const body = () => ({ ...request, ...(from ? { from_acct_num: from } : {}) });

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
  }, [ready, key, from, quote]);

  const reset = () => {
    setQuote(null);
    setPreview(null);
    setDone(null);
    setOrder(null);
    setGaveUp(false);
    setPin("");
    setNote("");
    setProblem("");
    reference.current = null;
    onReset?.();
  };

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      setQuote(await quoteExt({ ...body(), verify_recipient: true }));
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
        fromAcctNum: from,
        note: note.trim(),
        clientReference: reference.current,
        expectedCharge: quote.fee?.total_charge,
        pin: quote.pin_required === false ? "" : pin,
      });
      setDone(result ?? {});
    } catch (error) {
      setProblem(error.message);
      if (error.errorCode === "txn.quote_changed") {
        try {
          setQuote(await quoteExt({ ...body(), verify_recipient: true }));
          reference.current = newReference();
        } catch {
          setQuote(null);
        }
      }
    } finally {
      setPin("");
      setPending(false);
    }
  };

  const money = (value, q = quote ?? preview) =>
    formatMoney(value, q?.currency_code);
  const heading = (
    <div className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-slate-800">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
  const errorBox = problem && (
    <div className="mx-auto mb-5 max-w-2xl">
      <ErrorState message={problem} />
    </div>
  );
  const card =
    "mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm sm:p-6";

  if (isStaff(user)) {
    return (
      <div>
        {heading}
        <ErrorState
          message={t("ext.ownerOnlyAll", {
            defaultValue: "Only the merchant owner can do this.",
          })}
        />
      </div>
    );
  }
  if (featureKey && user?.features?.[featureKey] === false) {
    return (
      <div>
        {heading}
        <ErrorState
          message={t("ext.unavailable", {
            defaultValue: "This isn't available right now.",
          })}
        />
      </div>
    );
  }
  if (!providers) return <LoadingState />;
  if (!providers.length && !done) {
    return (
      <div>
        {heading}
        <ErrorState
          message={
            providersProblem ||
            t("ext.unavailable", {
              defaultValue: "This isn't available right now.",
            })
          }
        />
      </div>
    );
  }

  if (done) {
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
    const actions = (
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
        <div className="space-y-5">
          {heading}
          <ExtDetails details={details} />
          {extra?.(done, details)}
          {done.receipt ? (
            <PosReceipt
              transaction={receiptToTransaction(done.receipt, {
                quote,
                user,
                rrn: order?.rrn ?? done.rrn,
                toPhone: external.account,
                note: note.trim(),
              })}
              note={done.replayed ? t("send.replayed") : null}
              className="py-2"
            >
              {actions}
            </PosReceipt>
          ) : (
            <div className={`${card} text-center`}>
              <span className="brand-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-lime shadow-md">
                <Check size={26} />
              </span>
              <p className="mt-4 text-lg font-black text-slate-800">
                {t("ext.paid", { defaultValue: "Done" })}
              </p>
              {(order?.rrn ?? done.rrn) && (
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {t("ext.reference", { rrn: order?.rrn ?? done.rrn })}
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {actions}
              </div>
            </div>
          )}
        </div>
      );
    }
    const failed = status === "FAILED";
    const Icon = failed ? XCircle : Clock;
    const name = external.provider_name ?? "";
    const reason = failed
      ? order?.message ||
        t(`ext.error.${order?.error_code}`, {
          provider: name,
          defaultValue: t("ext.error.other", { provider: name }),
        })
      : "";
    const hint = failed
      ? `${reason} ${t("ext.sendFailedHint")}`
      : gaveUp
        ? t("ext.letYouKnowHint")
        : t("ext.inProgressHint");
    const waiting = !failed && !gaveUp;
    return (
      <div>
        {heading}
        <div className={`${card} text-center`}>
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ${failed ? "bg-red-500/10 text-red-600" : "brand-gradient text-lime"}`}
          >
            <Icon size={26} className={waiting ? "animate-pulse" : undefined} />
          </span>
          <p className="mt-4 text-lg font-black text-slate-800">
            {failed
              ? t("ext.notCompleted", {
                  provider: name,
                  defaultValue: "{{provider}} did not complete it",
                })
              : gaveUp
                ? t("ext.letYouKnow")
                : t("ext.processing", { defaultValue: "Processing" })}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {hint}
          </p>
          {waiting && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="h-2 w-2 animate-ping rounded-full bg-ink" />
              {t("ext.waiting")}
            </p>
          )}
          {(order?.rrn ?? done.rrn) && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              {t("ext.reference", { rrn: order?.rrn ?? done.rrn })}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {actions}
          </div>
        </div>
      </div>
    );
  }

  if (quote) {
    const needPin = quote.pin_required !== false;
    const holder =
      quote.external?.account_name ?? quote.recipient_name ?? quote.to?.name;
    return (
      <div>
        {heading}
        {errorBox}
        <form onSubmit={send} className={card}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("send.confirm")}
          </p>
          <FitText className="mt-2 font-black tracking-tight text-slate-800">
            {money(quote.amount)}
          </FitText>
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            {quote.external?.provider_name && (
              <Line label={t("ext.provider", { defaultValue: "Provider" })}>
                {quote.external.provider_name}
              </Line>
            )}
            {(lines?.(quote) ?? [])
              .filter(([, value]) => value != null && value !== "")
              .map(([label, value]) => (
                <Line key={label} label={label}>
                  {value}
                </Line>
              ))}
            {holder && (
              <Line label={t("ext.holder", { defaultValue: "Name" })}>
                {holder}
              </Line>
            )}
            <Line label={t("send.fee")}>
              {money(quote.fee?.total_charge ?? 0)}
            </Line>
            <Line label={t("ext.totalOut")} strong>
              {money(quote.total_debit ?? quote.amount)}
            </Line>
            {note.trim() && <Line label={t("ext.purpose")}>{note.trim()}</Line>}
          </dl>
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
              {t("ext.payNow", { defaultValue: "Pay" })}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {heading}
      {errorBox}
      <form onSubmit={review} className={`${card} space-y-5`}>
        {usable.length > 1 && (
          <FilterSelect
            label={t("send.from")}
            placeholder={t("ext.mainWallet")}
            clearable
            value={from}
            onChange={setFrom}
            options={usable.map((w) => ({
              value: w.acct_num,
              label: w.acct_product_name
                ? `${w.acct_product_name} · ${w.acct_num}`
                : w.acct_num,
              description: formatMoney(w.avail_bal, w.currency_code),
            }))}
          />
        )}
        {children}
        <TextField
          name="note"
          label={t("ext.purposeOptional", { defaultValue: "Note (optional)" })}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {ready && preview && (
          <dl className="divide-y divide-slate-100 rounded-2xl bg-ink/5 px-4 text-sm">
            {!noFee && (
              <Line label={t("send.fee")}>
                {money(preview.fee?.total_charge ?? 0, preview)}
              </Line>
            )}
            <Line label={t("ext.totalOut")} strong>
              {money(preview.total_debit ?? preview.amount, preview)}
            </Line>
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
    </div>
  );
}

// What the provider returned: a token (CREDELEC, some bills) shown large and
// copyable, then the rest (units, receipt and policy numbers, valid until).
const DETAIL_KEYS = ["units", "receipt_no", "policy_no", "valid_until"];
export function ExtDetails({ details }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
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
  const copy = () => {
    navigator.clipboard
      ?.writeText(String(token).replace(/\s/g, ""))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm sm:p-6">
      {token && (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t("ext.token", { defaultValue: "Token" })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-black tracking-wider text-slate-800 [overflow-wrap:anywhere] sm:text-3xl">
              {groupDigits(token)}
            </p>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied
                ? t("ext.copied", { defaultValue: "Copied" })
                : t("ext.copy", { defaultValue: "Copy" })}
            </button>
          </div>
        </>
      )}
      {rows.length > 0 && (
        <dl
          className={`divide-y divide-slate-100 text-sm ${token ? "mt-4" : ""}`}
        >
          {rows.map(([k, v]) => (
            <Line key={k} label={t(`ext.detail.${k}`)}>
              {v}
            </Line>
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

export function Line({ label, children, strong }) {
  return (
    <div
      className={`flex justify-between gap-3 py-2 ${strong ? "font-bold" : ""}`}
    >
      <dt className={strong ? "text-slate-700" : "text-slate-500"}>{label}</dt>
      <dd className="text-right text-slate-800 [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

// Choices as chips (operators, categories, amounts), for short lists.
export function Chips({ options, value, onChange, allowNone }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && allowNone ? "" : o.value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${on ? "border-ink bg-ink text-lime" : "border-slate-200 text-slate-600 hover:border-ink/40"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The providers of one kind (BANK, AIRTIME, ELECTRICITY, BILLER); null while
// loading, [] when the call fails (its message in `problem`).
export function useProviders(kind) {
  const [state, setState] = useState({ list: null, problem: "" });
  useEffect(() => {
    loadExtProviders()
      .then((rows) =>
        setState({ list: rows.filter((p) => p.kind === kind), problem: "" }),
      )
      .catch((error) => setState({ list: [], problem: error.message }));
  }, [kind]);
  return state;
}

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
export const cleanAmount = (value) => value.replace(/[^\d.]/g, "");
