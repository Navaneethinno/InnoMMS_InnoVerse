import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { loadWallets } from "@/Services/Account/account.api";
import {
  changeCardPin,
  issueCard,
  loadCardDetails,
  quoteCardMove,
  reissueCard,
  requestCard,
  resetCardPin,
  sendCardMove,
  setCardPin,
  setCardStatus,
} from "@/Services/Cards/cards.api";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { formatMoney, newReference } from "@/Utils/Lib/format";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import { receiptToTransaction } from "@/Utils/Lib/receiptTransaction";
import PosReceipt from "../Account/PosReceipt";

// The card dialogs. Each makes its one call; `onDone` refreshes the page.
// `pin` is always the transaction PIN, `card_pin` the card's own.

const digits = (value, max) => value.replace(/\D/g, "").slice(0, max);
const DELIVERY = ["BRANCH_PICKUP", "COURIER", "AGENT"];

// The transaction PIN (letters allowed when the product says so) or, with
// `length`, the card's own PIN (digits only, of the card's length).
function PinInput({ label, value, onChange, length }) {
  const rules = usePinRules();
  const card = length != null;
  return (
    <TextField
      name="pin"
      type="password"
      inputMode={card || !rules.letters ? "numeric" : undefined}
      maxLength={card ? length : rules.maxLength}
      autoComplete="off"
      label={label}
      value={value}
      onChange={(event) => onChange(card ? digits(event.target.value, length) : sanitizePin(rules, event.target.value))}
    />
  );
}

// A dialog with its problem, body and a confirm button.
function Shell({ open = true, title, description, problem, onClose, pending, confirm, disabled, onConfirm, danger, children }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title={title} description={description} pending={pending}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (onConfirm && !pending && !disabled) onConfirm();
        }}
      >
        {problem && <ErrorState message={problem.message} problems={problem.problems} />}
        {/* A locked transaction PIN is unlocked by resetting it on Security. */}
        {problem?.errorCode === "portal.pin_locked" && (
          <Link to="/security" onClick={onClose} className="block text-sm font-bold text-ink underline">
            {t("send.goSecurity")}
          </Link>
        )}
        {children}
        {onConfirm && (
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              {t("cards.cancel")}
            </Button>
            <Button type="submit" pending={pending} disabled={disabled} className={danger ? "!bg-red-600 hover:!bg-red-700" : undefined}>
              {confirm}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}

// Runs a call: pending while it runs, the API's refusal shown in the dialog.
function useCall() {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState(null);
  const run = async (call) => {
    setPending(true);
    setProblem(null);
    try {
      return await call();
    } catch (error) {
      setProblem({ message: error.message, problems: error.problems, errorCode: error.errorCode });
      return undefined;
    } finally {
      setPending(false);
    }
  };
  return { pending, problem, run };
}

function DeliveryFields({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <>
      <FilterSelect label={t("cards.delivery")} value={value.delivery_mode} onChange={(v) => onChange({ ...value, delivery_mode: v })} options={DELIVERY.map((m) => ({ value: m, label: t(`cards.deliveryMode.${m}`) }))} />
      <TextField name="delivery_ref" label={t("cards.deliveryRef")} maxLength={255} value={value.delivery_ref} onChange={(event) => onChange({ ...value, delivery_ref: event.target.value })} />
    </>
  );
}
const deliveryBody = (d) => ({ delivery_mode: d.delivery_mode, ...(d.delivery_ref.trim() ? { delivery_ref: d.delivery_ref.trim() } : {}) });

const feeLine = (t, fee, currency) => (Number(fee) > 0 ? t("cards.feeIs", { fee: formatMoney(fee, currency) }) : t("cards.noFee"));

// Get a card from an offer: a virtual card at once, or a personalised
// physical card (a request). The fee is shown before the PIN.
export function GetCardDialog({ offer, physical, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [pin, setPin] = useState("");
  const key = useRef(newReference());
  const submit = () =>
    run(async () => {
      const body = { card_product_id: offer.card_product_id, ...(name.trim() ? { name_on_card: name.trim() } : {}), idempotency_key: key.current, pin };
      const result = physical ? await requestCard({ ...body, ...deliveryBody(delivery) }) : await issueCard(body);
      onDone(result, physical ? "requested" : "issued");
    });
  return (
    <Shell
      title={t(physical ? "cards.requestPhysical" : "cards.getVirtual")}
      description={`${offer.product_name} · ${feeLine(t, offer.new_card_fee, offer.currency_code)}`}
      problem={problem}
      onClose={onClose}
      pending={pending}
      confirm={t(physical ? "cards.request" : "cards.getCard")}
      disabled={pin.length < pinMin || (offer.emboss_name_required && !name.trim())}
      onConfirm={submit}
    >
      <TextField name="name_on_card" label={t(offer.emboss_name_required ? "cards.nameOnCard" : "cards.nameOnCardOptional")} maxLength={26} value={name} onChange={(event) => setName(event.target.value.toUpperCase())} />
      {physical && <DeliveryFields value={delivery} onChange={setDelivery} />}
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}

// The plastic of a virtual card: same number, delivered like a personalised card.
export function PlasticDialog({ card, fee, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [pin, setPin] = useState("");
  const key = useRef(newReference());
  return (
    <Shell
      title={t("cards.orderPlastic")}
      description={`${t("cards.plasticHint")} ${feeLine(t, fee, card.currency_code)}`}
      problem={problem}
      onClose={onClose}
      pending={pending}
      confirm={t("cards.request")}
      disabled={pin.length < pinMin}
      onConfirm={() => run(async () => onDone(await requestCard({ id: card.id, ...deliveryBody(delivery), idempotency_key: key.current, pin }), "requested"))}
    >
      <DeliveryFields value={delivery} onChange={setDelivery} />
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}

// The card PIN: set the first one (it activates a PIN_SET card), change it
// with the current one, or reset it (also unlocks it) with the transaction PIN.
export function CardPinDialog({ card, mode, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const length = Number(card.pin_length) || 4;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pin, setPin] = useState("");
  const ready = next.length === length && next === again && (mode === "change" ? current.length === length : pin.length >= pinMin);
  const submit = () =>
    run(async () => {
      if (mode === "set") await setCardPin({ id: card.id, card_pin: next, pin });
      else if (mode === "change") await changeCardPin({ id: card.id, current_card_pin: current, card_pin: next });
      else await resetCardPin({ id: card.id, card_pin: next, pin });
      onDone(null, `pin_${mode}`);
    });
  return (
    <Shell title={t(`cards.pinTitle.${mode}`)} description={t("cards.pinHint", { count: length })} problem={problem} onClose={onClose} pending={pending} confirm={t(`cards.pinConfirm.${mode}`)} disabled={!ready} onConfirm={submit}>
      {mode === "change" && <PinInput label={t("cards.currentCardPin")} value={current} onChange={setCurrent} length={length} />}
      <PinInput label={t("cards.newCardPin")} value={next} onChange={setNext} length={length} />
      <PinInput label={t("cards.repeatCardPin")} value={again} onChange={setAgain} length={length} />
      {again.length === length && again !== next && <p className="text-xs font-semibold text-red-600">{t("cards.pinsDiffer")}</p>}
      {mode !== "change" && <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />}
    </Shell>
  );
}

// Block (at once), unblock (with the transaction PIN), or report lost or
// stolen (for good: confirmed first).
export function CardStatusDialog({ card, to, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const final = to === "LOST" || to === "STOLEN";
  const submit = () => run(async () => onDone(await setCardStatus({ id: card.id, to, ...(to === "ACTIVE" ? { pin } : {}), ...(final && reason.trim() ? { reason: reason.trim() } : {}) }), `status_${to}`));
  return (
    <Shell title={t(`cards.statusTitle.${to}`)} description={t(`cards.statusHint.${to}`)} problem={problem} onClose={onClose} pending={pending} confirm={t(`cards.statusConfirm.${to}`)} disabled={to === "ACTIVE" && pin.length < pinMin} danger={to !== "ACTIVE"} onConfirm={submit}>
      {final && <TextField name="reason" label={t("cards.reasonOptional")} maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />}
      {to === "ACTIVE" && <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />}
    </Shell>
  );
}

const SHOW_SECONDS = 30;

// A virtual card's full number and CVV, for paying online: asked for with
// the transaction PIN each time, shown for a short while, then gone. They
// live only in this dialog's state and are dropped on close.
export function CardDetailsDialog({ card, onClose }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [pin, setPin] = useState("");
  const [details, setDetails] = useState(null);
  const [left, setLeft] = useState(SHOW_SECONDS);
  // The parent hands a new onClose on every render; the effects below must
  // not restart (or hide the details) because of that.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!details) return undefined;
    setLeft(SHOW_SECONDS);
    const timer = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [details]);
  useEffect(() => {
    if (details && left <= 0) close.current();
  }, [details, left]);
  // Closed (and so hidden) when the tab is left, after the time is up or on
  // "Hide now"; dropped when the dialog closes.
  useEffect(() => {
    const hide = () => document.hidden && close.current();
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      setDetails(null);
    };
  }, []);

  const reveal = () =>
    run(async () => {
      setDetails(await loadCardDetails({ id: card.id, pin }));
      setPin("");
    });
  const group = (pan) => String(pan ?? "").replace(/(\d{4})(?=\d)/g, "$1 ");

  return (
    <Shell title={t("cards.detailsTitle")} description={t("cards.detailsHint")} problem={problem} onClose={onClose} pending={pending} confirm={t("cards.reveal")} disabled={pin.length < pinMin} onConfirm={details ? undefined : reveal}>
      {details ? (
        <div className="space-y-3">
          <div className="brand-gradient rounded-2xl p-5 text-white">
            <p className="font-mono text-xl font-semibold tracking-[0.12em] [overflow-wrap:anywhere]">{group(details.pan)}</p>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <span>
                <span className="block text-[10px] uppercase tracking-wider text-white/70">{t("cards.expiry")}</span>
                <span className="font-mono font-semibold">{details.expiry}</span>
              </span>
              <span>
                <span className="block text-[10px] uppercase tracking-wider text-white/70">CVV</span>
                <span className="font-mono font-semibold">{details.cvv}</span>
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-white/70">{t("cards.name")}</span>
                <span className="font-semibold uppercase">{details.name_on_card}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{t("cards.hidesIn", { count: Math.max(left, 0) })}</span>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 font-semibold text-ink">
              <EyeOff size={14} /> {t("cards.hideNow")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Eye size={15} /> {t("cards.detailsSecret")}
          </p>
          <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
        </>
      )}
    </Shell>
  );
}

// Replace a card: after it was reported lost or stolen, a damaged physical
// card, or a renewal near expiry. The fee, if the institution sets one, is
// taken now.
export function ReissueDialog({ card, reasons, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [reason, setReason] = useState(reasons[0]);
  const [name, setName] = useState(card.name_on_card || (card.perso_mode === "INSTANT" ? "" : card.holder_name) || "");
  const [delivery, setDelivery] = useState({ delivery_mode: "BRANCH_PICKUP", delivery_ref: "" });
  const [pin, setPin] = useState("");
  const key = useRef(newReference());
  const physical = card.form_factor === "PHYSICAL";
  const submit = () =>
    run(async () => {
      const result = await reissueCard({ id: card.id, reissue_reason: reason, idempotency_key: key.current, pin, ...(name.trim() ? { name_on_card: name.trim() } : {}), ...(physical ? deliveryBody(delivery) : {}) });
      onDone(result, "reissued");
    });
  return (
    <Shell title={t(reason === "EXPIRED" ? "cards.renewTitle" : "cards.replaceTitle")} description={t(physical ? "cards.reissuePhysical" : "cards.reissueVirtual")} problem={problem} onClose={onClose} pending={pending} confirm={t(reason === "EXPIRED" ? "cards.renew" : "cards.replace")} disabled={pin.length < pinMin} onConfirm={submit}>
      {reasons.length > 1 && <FilterSelect label={t("cards.reason")} value={reason} onChange={setReason} options={reasons.map((r) => ({ value: r, label: t(`cards.reissueReason.${r}`) }))} />}
      <TextField name="name_on_card" label={t("cards.nameOnCardOptional")} maxLength={26} value={name} onChange={(event) => setName(event.target.value.toUpperCase())} />
      {physical && <DeliveryFields value={delivery} onChange={setDelivery} />}
      <p className="text-xs text-slate-500">{t("cards.reissueFee")}</p>
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}

// Load (wallet -> card) or unload (card -> wallet) a prepaid card: the
// amount and wallet, the quote, the PIN when asked, then the receipt. One
// client reference per attempt makes a retry safe.
export function CardMoneyDialog({ card, txnType, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [wallets, setWallets] = useState([]);
  const [from, setFrom] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [done, setDone] = useState(null);
  const reference = useRef(null);

  useEffect(() => {
    loadWallets()
      .then((list) => {
        const own = list.filter((w) => !card.currency_code || w.currency_code === card.currency_code);
        setWallets(own);
        setFrom(own[0]?.acct_num ?? "");
      })
      .catch(() => setWallets([]));
  }, [card.currency_code]);

  const move = { txnType, cardId: card.id, amount, fromAcctNum: wallets.length > 1 ? from : "" };
  const review = () =>
    run(async () => {
      setQuote(await quoteCardMove(move));
      reference.current = newReference();
      setPin("");
    });
  const send = () =>
    run(async () => {
      setDone(await sendCardMove({ ...move, clientReference: reference.current, pin: quote.pin_required ? pin : "" }));
    });

  const title = t(txnType === "CARD_LOAD" ? "cards.load" : "cards.unload");
  if (done) {
    return (
      <Modal open onOpenChange={(next) => !next && onDone(done, txnType)} title={title}>
        <PosReceipt transaction={receiptToTransaction(done.receipt, { quote, rrn: done.rrn })} note={done.replayed ? t("send.replayed") : null}>
          <Button onClick={() => onDone(done, txnType)}>{t("cards.done")}</Button>
        </PosReceipt>
      </Modal>
    );
  }
  if (quote) {
    const fee = quote.fee?.total_charge;
    return (
      <Shell title={title} problem={problem} onClose={onClose} pending={pending} confirm={title} disabled={quote.pin_required && pin.length < pinMin} onConfirm={send}>
        <dl className="divide-y divide-slate-100 text-sm">
          <div className="flex justify-between gap-3 py-2">
            <dt className="text-slate-500">{t("cards.amount")}</dt>
            <dd className="text-right font-semibold [overflow-wrap:anywhere]">{formatMoney(quote.amount, quote.currency_code)}</dd>
          </div>
          {fee != null && Number(fee) !== 0 && (
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-slate-500">{quote.fee?.fee_name ?? t("send.fee")}</dt>
              <dd className="text-right [overflow-wrap:anywhere]">{formatMoney(fee, quote.currency_code)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 py-2 font-bold">
            <dt>{t("send.total")}</dt>
            <dd className="text-right [overflow-wrap:anywhere]">{formatMoney(quote.total_debit, quote.currency_code)}</dd>
          </div>
        </dl>
        {quote.pin_required && <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />}
        <button type="button" onClick={() => setQuote(null)} disabled={pending} className="text-sm font-semibold text-slate-500 hover:text-ink">
          {t("send.back")}
        </button>
      </Shell>
    );
  }
  return (
    <Shell title={title} description={t(txnType === "CARD_LOAD" ? "cards.loadHint" : "cards.unloadHint")} problem={problem} onClose={onClose} pending={pending} confirm={t("cards.review")} disabled={!(Number(amount) > 0)} onConfirm={review}>
      {wallets.length > 1 && <FilterSelect label={t(txnType === "CARD_LOAD" ? "cards.fromWallet" : "cards.toWallet")} value={from} onChange={setFrom} options={wallets.map((w) => ({ value: w.acct_num, label: `${w.acct_product_name ?? w.acct_num} · ${w.acct_num} · ${formatMoney(w.avail_bal, w.currency_code)}` }))} />}
      <TextField name="amount" label={t("cards.amountIn", { currency: card.currency_code ?? "" })} inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} />
    </Shell>
  );
}
