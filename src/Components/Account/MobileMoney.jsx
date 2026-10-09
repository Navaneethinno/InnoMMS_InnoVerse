import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Clock, Smartphone, XCircle } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import FitText from "@/Components/Common/FitText";
import LoadingState from "@/Components/Common/LoadingState";
import PhoneField from "@/Components/Common/PhoneField";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import PosReceipt from "@/Components/Account/PosReceipt";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { useExtOrder, useWalletChanged } from "@/Services/api/liveUpdates";
import { loadExtOrder, loadExtProviders, loadReceipt, loadWallets, quotePayment, sendPayment } from "@/Services/Account/account.api";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import { isStaff, sendableWallets } from "@/Utils/Lib/roles";

// Mobile money (M-Pesa, e-Mola, mKesh), for the merchant owner:
//  - Send (EXT_WALLET_OUT): from the wallet to a mobile-wallet number. The
//    providers don't say whose a number is, so there is no recipient name.
//  - Top up (EXT_WALLET_IN): pulls from the merchant's own number (or another
//    of theirs); they approve on that phone and the wallet is credited then.
// form (live fee) -> confirm -> PIN -> account/send, one client_reference per
// attempt (reused on a retry, so nothing is charged twice).
const TXN = { send: "EXT_WALLET_OUT", topUp: "EXT_WALLET_IN" };
const EMPTY = { phone: "", amount: "", note: "" };
// How long the screen waits for the provider before saying "we'll let you know".
const WAIT_MS = 3 * 60 * 1000;
const POLL_MS = 15000;
const digitsOf = (phone) => String(phone ?? "").replace(/\D/g, "").replace(/^258/, "");

export default function MobileMoney() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const pinRules = usePinRules();
  const portalPolicy = usePortalPolicy();
  const [mode, setMode] = useState("send");
  const [providers, setProviders] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [from, setFrom] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [otherNumber, setOtherNumber] = useState(false);
  const [preview, setPreview] = useState(null);
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  // The order's final state (live `ext_order` event, or account/ext_order), the
  // top-up's receipt once credited, and whether the screen stopped waiting.
  const [order, setOrder] = useState(null);
  const [topUpReceipt, setTopUpReceipt] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const reference = useRef(null);
  const sending = mode === "send";

  useEffect(() => {
    loadExtProviders()
      .then(setProviders)
      .catch((error) => {
        setProviders([]);
        setProblem(error.message);
      });
    loadWallets()
      .then((list) => setWallets(sendableWallets(list, user)))
      .catch(() => {});
  }, [user]);
  useWalletChanged(() => {
    loadWallets()
      .then((list) => setWallets(sendableWallets(list, user)))
      .catch(() => {});
  });

  const orderRef = done?.external?.order_ref;
  const open = Boolean(done) && !order && (done.external?.status ?? "PENDING") === "PENDING";
  const settle = (next) => {
    if (!next || next.status === "PENDING") return;
    setOrder(next);
    // The live event carries only error_code: account/ext_order has the
    // reason in the portal's language.
    if (next.status === "FAILED" && !next.message && next.order_ref)
      loadExtOrder(next.order_ref)
        .then((full) => full?.message && setOrder((o) => ({ ...o, message: full.message })))
        .catch(() => {});
    // A credited top-up has a receipt of its own.
    if (next.status === "SUCCESS" && next.txn_type === TXN.topUp && next.rrn) loadReceipt({ rrn: next.rrn }).then(setTopUpReceipt).catch(() => {});
  };
  useExtOrder((detail) => {
    if (open && ((orderRef && detail?.order_ref === orderRef) || (done.rrn && detail?.rrn === done.rrn))) settle(detail);
  });
  // Fallback when no event arrives: ask now and then, and stop after a while.
  useEffect(() => {
    if (!open || !orderRef) return undefined;
    const poll = window.setInterval(() => loadExtOrder(orderRef).then(settle).catch(() => {}), POLL_MS);
    const stop = window.setTimeout(() => setGaveUp(true), WAIT_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
     
  }, [open, orderRef]);

  const offered = useMemo(() => (providers ?? []).filter((p) => (sending ? p.send : p.top_up)), [providers, sending]);
  const names = offered.map((p) => p.name);
  // Only wallets in a currency the providers use (MZN).
  const currencies = new Set(offered.map((p) => p.currency_code).filter(Boolean));
  const usable = currencies.size ? wallets.filter((w) => currencies.has(w.currency_code)) : wallets;
  const namesText = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t("ext.or", { defaultValue: "or" })} ${names.at(-1)}` : (names[0] ?? "");
  // The provider the typed number belongs to, for its logo (the server decides).
  const digits = digitsOf(form.phone);
  const guessed = digits.length >= 2 ? offered.find((p) => (p.prefixes ?? []).some((prefix) => digits.startsWith(prefix))) : null;
  const phone = sending || otherNumber ? form.phone.trim() : "";
  const target = () => (sending ? { txnType: TXN.send, toPhone: phone } : { txnType: TXN.topUp, fromPhone: phone });
  const ready = Number(form.amount) > 0 && (sending ? digits.length >= 9 : !otherNumber || digits.length >= 9);

  // The fee, asked again as the amount or the number changes.
  useEffect(() => {
    if (!ready || quote) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      quotePayment({ ...target(), amount: form.amount, fromAcctNum: from })
        .then((next) => !cancelled && setPreview(next))
        .catch(() => !cancelled && setPreview(null));
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, form.amount, phone, from, mode, quote]);

  const switchMode = (next) => {
    setMode(next);
    setForm(EMPTY);
    setPreview(null);
    setProblem("");
    setOtherNumber(false);
  };
  const reset = () => {
    setForm(EMPTY);
    setQuote(null);
    setPreview(null);
    setDone(null);
    setOrder(null);
    setTopUpReceipt(null);
    setGaveUp(false);
    setPin("");
    reference.current = null;
  };

  const review = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      setQuote(await quotePayment({ ...target(), amount: form.amount, fromAcctNum: from }));
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
      const result = await sendPayment({
        ...target(),
        amount: form.amount,
        fromAcctNum: from,
        note: form.note.trim(),
        clientReference: reference.current,
        expectedCharge: quote.fee?.total_charge,
        pin: quote.pin_required === false ? "" : pin,
      });
      setDone(result ?? {});
    } catch (error) {
      setProblem(error.message);
      if (error.errorCode === "txn.quote_changed") {
        // The fee changed (nothing moved): show the new figures, as a new attempt.
        try {
          setQuote(await quotePayment({ ...target(), amount: form.amount, fromAcctNum: from }));
          reference.current = newReference();
        } catch {
          setQuote(null);
        }
      }
      // Otherwise the same reference is kept: if the connection dropped,
      // sending again can't charge twice.
    } finally {
      setPin("");
      setPending(false);
    }
  };

  const money = (value, q = quote ?? preview) => formatMoney(value, q?.currency_code);
  const heading = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("ext.title", { defaultValue: "Mobile money" })}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {sending
            ? t("ext.sendSubtitle", { names: namesText, defaultValue: "Send money to {{names}}." })
            : t("ext.topUpSubtitle", { names: namesText, defaultValue: "Top up your wallet from {{names}}." })}
        </p>
      </div>
      {!quote && !done && (
        <SegmentedTabs
          items={[
            { key: "send", label: t("ext.send", { defaultValue: "Send" }) },
            { key: "topUp", label: t("ext.topUp", { defaultValue: "Top up" }) },
          ]}
          value={mode}
          onChange={switchMode}
        />
      )}
    </div>
  );
  const errorBox = problem && (
    <div className="mb-5 max-w-2xl">
      <ErrorState message={problem} />
    </div>
  );
  const card = "mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm";

  if (isStaff(user)) {
    return (
      <div>
        {heading}
        <ErrorState message={t("ext.ownerOnly", { defaultValue: "Only the merchant owner can use mobile money." })} />
      </div>
    );
  }
  if (user?.features?.mobile_money === false) {
    return (
      <div>
        {heading}
        <ErrorState message={t("ext.none", { defaultValue: "Mobile money isn't available right now." })} />
      </div>
    );
  }
  if (!providers) return <LoadingState />;

  // Done. A successful send prints its receipt; a credited top-up prints its
  // own; a failure says the money came back (send) or nothing moved (top-up).
  if (done) {
    const external = { ...(quote?.external ?? {}), ...(done.external ?? {}), ...(order ?? {}) };
    const status = order?.status ?? external.status ?? "PENDING";
    const receipt = sending ? done.receipt : topUpReceipt;
    const actions = (
      <>
        <Button onClick={reset}>{sending ? t("ext.again", { defaultValue: "Send again" }) : t("cards.done")}</Button>
        <Link to="/history" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-semibold text-ink hover:bg-slate-50">
          {t("send.viewHistory")}
        </Link>
      </>
    );
    if (status === "SUCCESS" && receipt) {
      return (
        <PosReceipt
          transaction={receiptToTransaction(receipt, { quote, user, rrn: order?.rrn ?? done.rrn, toPhone: sending ? external.account : undefined, note: form.note.trim() })}
          note={done.replayed ? t("send.replayed") : sending ? null : t("ext.creditedHint", { amount: money(done.net_credit ?? quote?.net_credit), defaultValue: "{{amount}} is in your wallet." })}
          className="py-2"
        >
          {actions}
        </PosReceipt>
      );
    }
    const failed = status === "FAILED";
    const Icon = failed ? XCircle : sending ? Clock : Smartphone;
    const title = failed
      ? sending
        ? t("ext.sendFailed", { provider: external.provider_name, defaultValue: "{{provider}} did not accept the transfer" })
        : t("ext.topUpFailed", { defaultValue: "The top-up was not approved" })
      : gaveUp
        ? t("ext.letYouKnow", { defaultValue: "We'll let you know" })
        : sending
          ? t("ext.inProgress", { defaultValue: "Transfer in progress" })
          : t("ext.approveOnPhone", { provider: external.provider_name, defaultValue: "Approve the request on your {{provider}} phone" });
    // Why it failed: the server's text, else ours for the code.
    const reason = failed
      ? order?.message ||
        t(`ext.error.${order?.error_code}`, {
          provider: external.provider_name,
          defaultValue: t("ext.error.other", { provider: external.provider_name, defaultValue: "{{provider}} did not complete the transfer" }),
        })
      : "";
    const hint = failed
      ? reason + " " + (sending
        ? t("ext.sendFailedHint", { defaultValue: "Your money was returned to your wallet." })
        : t("ext.topUpFailedHint", { defaultValue: "Nothing was taken and your wallet is unchanged." }))
      : gaveUp
        ? t("ext.letYouKnowHint", { defaultValue: "The provider hasn't answered yet. You'll get a notification when it does, and it shows in your history." })
        : sending
          ? t("ext.inProgressHint", { defaultValue: "It finishes by itself within a few minutes. If it fails, the money comes back and you are notified." })
          : t("ext.approveHint", { amount: money(done.net_credit ?? quote?.net_credit), number: external.account, defaultValue: "We asked {{number}} for the money. Your wallet gets {{amount}} once you approve." });
    const waiting = !failed && !gaveUp && status !== "SUCCESS";
    return (
      <div>
        {heading}
        <div className={`${card} text-center`}>
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-md ${failed ? "bg-red-500/10 text-red-600" : "brand-gradient text-lime"}`}>
            <Icon size={26} className={waiting ? "animate-pulse" : undefined} />
          </span>
          <p className="mt-4 text-lg font-black text-slate-800">{title}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{hint}</p>
          {waiting && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="h-2 w-2 animate-ping rounded-full bg-ink" />
              {t("ext.waiting", { defaultValue: "Waiting for the provider…" })}
            </p>
          )}
          {(order?.rrn ?? done.rrn) && <p className="mt-3 text-xs font-semibold text-slate-500">{t("ext.reference", { rrn: order?.rrn ?? done.rrn, defaultValue: "Reference {{rrn}}" })}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
        </div>
      </div>
    );
  }

  // Confirm, then the PIN.
  if (quote) {
    const external = quote.external ?? {};
    const needPin = quote.pin_required !== false;
    return (
      <div>
        {heading}
        {errorBox}
        <form onSubmit={send} className={card}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("send.confirm")}</p>
          <FitText className="mt-2 font-black tracking-tight text-slate-800">{money(quote.amount)}</FitText>
          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <Line label={t("ext.type", { defaultValue: "Transaction type" })}>
              {sending
                ? t("ext.typeOut", { provider: external.provider_name, defaultValue: "E-taku to {{provider}}" })
                : t("ext.typeIn", { provider: external.provider_name, defaultValue: "{{provider}} to E-taku" })}
            </Line>
            <Line label={sending ? t("ext.recipient", { defaultValue: "Recipient number" }) : t("ext.fromNumber", { defaultValue: "From number" })}>{external.account}</Line>
            <Line label={sending ? t("ext.amountOut", { defaultValue: "Transfer amount" }) : t("ext.amountIn", { defaultValue: "Top-up amount" })}>{money(quote.amount)}</Line>
            <Line label={t("send.fee")}>{money(quote.fee?.total_charge ?? 0)}</Line>
            <Line label={sending ? t("ext.totalOut", { defaultValue: "Total to pay" }) : t("ext.netIn", { defaultValue: "You receive" })} strong>
              {money(sending ? quote.total_debit : quote.net_credit)}
            </Line>
            {form.note.trim() && <Line label={t("ext.purpose", { defaultValue: "Purpose" })}>{form.note.trim()}</Line>}
          </dl>
          {sending && <p className="mt-3 text-xs text-slate-500">{t("ext.noName", { defaultValue: "Mobile wallets don't share the owner's name: check the number before you send." })}</p>}
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
                onChange={(event) => setPin(sanitizePin(pinRules, event.target.value))}
              />
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" disabled={pending} onClick={() => setQuote(null)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-ink/5 hover:text-ink">
              {t("send.back")}
            </button>
            <Button type="submit" pending={pending} disabled={needPin && pin.length < pinRules.entryMin} className="px-8">
              {sending ? t("ext.sendNow", { defaultValue: "Send" }) : t("ext.requestTopUp", { defaultValue: "Request top-up" })}
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
      {offered.length === 0 ? (
        <ErrorState message={t("ext.none", { defaultValue: "Mobile money isn't available right now." })} />
      ) : (
        <form onSubmit={review} className={`${card} space-y-4`}>
          {offered.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {offered.map((p) => (
                <span key={p.code} className={`rounded-full border px-3 py-1 text-xs font-bold transition ${guessed?.code === p.code ? "border-ink bg-ink text-lime" : "border-slate-200 text-slate-500"}`}>
                  {p.name}
                </span>
              ))}
            </div>
          )}
          {usable.length > 1 && (
            <FilterSelect
              label={sending ? t("send.from") : t("ext.toWallet", { defaultValue: "Into wallet" })}
              placeholder={t("ext.mainWallet", { defaultValue: "Main wallet" })}
              clearable
              value={from}
              onChange={setFrom}
              options={usable.map((w) => ({ value: w.acct_num, label: w.acct_product_name ? `${w.acct_product_name} · ${w.acct_num}` : w.acct_num, description: formatMoney(w.avail_bal, w.currency_code) }))}
            />
          )}
          {!sending && (
            <SegmentedTabs
              items={[
                { key: "own", label: t("ext.ownNumber", { defaultValue: "My number" }) },
                { key: "other", label: t("ext.otherNumber", { defaultValue: "Another of my numbers" }) },
              ]}
              value={otherNumber ? "other" : "own"}
              onChange={(key) => setOtherNumber(key === "other")}
            />
          )}
          {(sending || otherNumber) && (
            <PhoneField
              name="phone"
              label={sending ? t("ext.recipient", { defaultValue: "Recipient number" }) : t("ext.fromNumber", { defaultValue: "From number" })}
              countries={portalPolicy.phone.countries}
              value={form.phone}
              onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
            />
          )}
          <TextField name="amount" inputMode="decimal" label={t("send.amount")} value={form.amount} onChange={(event) => setForm((f) => ({ ...f, amount: event.target.value.replace(/[^\d.]/g, "") }))} />
          <TextField name="note" label={t("ext.purpose", { defaultValue: "Purpose" })} value={form.note} onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))} />
          {ready && preview && (
            <dl className="divide-y divide-slate-100 rounded-2xl bg-ink/5 px-4 text-sm">
              <Line label={t("send.fee")}>{money(preview.fee?.total_charge ?? 0, preview)}</Line>
              <Line label={sending ? t("ext.totalOut", { defaultValue: "Total to pay" }) : t("ext.netIn", { defaultValue: "You receive" })} strong>
                {money(sending ? preview.total_debit : preview.net_credit, preview)}
              </Line>
            </dl>
          )}
          <div className="flex justify-end">
            <Button type="submit" pending={pending} disabled={!ready} className="px-8">
              {t("send.review")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-3 py-2 ${strong ? "font-bold" : ""}`}>
      <dt className={strong ? "text-slate-700" : "text-slate-500"}>{label}</dt>
      <dd className="text-right text-slate-800 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
