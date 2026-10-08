import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Eye, KeyRound, Lock, LockOpen, Plus, Power, RotateCcw, ShieldAlert, Truck } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import { useCardChanged } from "@/Services/api/liveUpdates";
import { activateCard, cancelRequest, loadCard, loadCards, loadOffers } from "@/Services/Cards/cards.api";
import { formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";
import CardFace from "./CardFace";
import { TransactionPinNotice } from "@/Components/Account/TransactionPinSetup";
import { CardDetailsDialog, CardMoneyDialog, CardPinDialog, CardStatusDialog, GetCardDialog, PlasticDialog, ReissueDialog } from "./CardDialogs";

// Cards: the merchant's cards and requests, what they can get, and
// everything they can do with a card. Live: a change to any of their cards
// (by them, the institution or the system) refreshes the page.
export default function Cards() {
  const { t } = useTranslation();
  const [state, setState] = useState({ cards: null, requests: [], offers: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, offers] = await Promise.all([loadCards(), loadOffers().catch(() => [])]);
      setState({ cards: list?.cards ?? [], requests: list?.requests ?? [], offers });
      setProblem("");
    } catch (error) {
      setState((s) => ({ ...s, cards: s.cards ?? [] }));
      setProblem(error.message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, t]);

  const cards = state.cards ?? [];
  const selected = cards.find((c) => c.id === selectedId) ?? cards[0] ?? null;

  const refreshDetail = useCallback(async (id) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await loadCard(id));
    } catch {
      setDetail(null);
    }
  }, []);
  useEffect(() => {
    void refreshDetail(selected?.id);
  }, [selected?.id, refreshDetail]);

  useCardChanged(() => {
    void refresh();
    void refreshDetail(selected?.id);
  });

  const done = (result, what) => {
    setDialog(null);
    setNotice(t(`cards.notice.${what}`, { defaultValue: "" }));
    // A new card (issued, or a virtual replacement) is the one shown next.
    const fresh = what === "issued" ? result?.id : what === "reissued" ? result?.card?.id : null;
    if (fresh) setSelectedId(fresh);
    void refresh();
    void refreshDetail(selected?.id);
  };

  const card = detail && selected && detail.id === selected.id ? { ...selected, ...detail } : selected;
  const offerOf = (c) => state.offers.find((o) => o.card_product_id === c?.card_product_id);

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("cards.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("cards.subtitle")}</p>
      </div>
      <TransactionPinNotice />
      {problem && (
        <div>
          <ErrorState message={problem} onRetry={() => void refresh()} />
        </div>
      )}
      {notice && <p className="rounded-2xl border border-emerald-500/40 bg-surface p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{notice}</p>}

      {state.cards === null ? (
        <p className="text-sm text-slate-500">{t("cards.loading")}</p>
      ) : (
        <div className={cn("grid items-start gap-8", cards.length > 0 && "lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]")}>
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("cards.yourCards")}</h2>
            {cards.length ? (
              <div className="-m-1 grid auto-rows-max max-h-[70vh] gap-4 overflow-y-auto p-1 lg:max-h-[calc(100dvh-12rem)]">
                {cards.map((c) => (
                  <CardFace key={c.id} card={c} selected={selected?.id === c.id} onClick={() => setSelectedId(c.id)} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-surface/60 px-6 py-7">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink">
                  <CreditCard size={22} />
                </span>
                <p className="text-sm leading-6 text-slate-600">{t("cards.none")}</p>
              </div>
            )}
          </section>

          {card && <CardPanel card={card} offer={offerOf(card)} onDialog={setDialog} onDone={done} />}
        </div>
      )}

      {state.requests.length > 0 && <Requests requests={state.requests} onDone={done} />}
      {state.offers.length > 0 && <Offers offers={state.offers} onGet={(offer, physical) => setDialog({ kind: "get", offer, physical })} />}

      {dialog?.kind === "get" && <GetCardDialog offer={dialog.offer} physical={dialog.physical} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "plastic" && <PlasticDialog card={card} fee={offerOf(card)?.physical_card_fee} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "pin" && <CardPinDialog card={card} mode={dialog.mode} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "status" && <CardStatusDialog card={card} to={dialog.to} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "details" && <CardDetailsDialog card={card} onClose={() => setDialog(null)} />}
      {dialog?.kind === "reissue" && <ReissueDialog card={card} reasons={dialog.reasons} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "money" && <CardMoneyDialog card={card} txnType={dialog.txnType} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}

// The selected card: its money and settings, the buttons its actions allow,
// and its history.
function CardPanel({ card, offer, onDialog, onDone }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const a = card.actions ?? {};
  // The server decides what each card can do (`actions`) and the reasons it
  // may be replaced for now (`reissue_reasons`); a renewal is its own button.
  const reasons = (card.reissue_reasons ?? []).filter((r) => r !== "EXPIRED");
  // The statuses the server lets this holder move the card to now.
  const canMoveTo = (status) => !Array.isArray(card.status_changes) || card.status_changes.includes(status);
  const lostOrStolen = card.ops_status === "LOST" || card.ops_status === "STOLEN";

  const activate = async () => {
    setBusy(true);
    setProblem("");
    try {
      await activateCard(card.id);
      onDone(null, "activated");
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  const buttons = [
    a.pin_set && { key: "pin_set", group: "main", label: t("cards.setPin"), icon: KeyRound, primary: true, run: () => onDialog({ kind: "pin", mode: "set" }) },
    a.activate && { key: "activate", group: "main", label: t("cards.activate"), icon: Power, primary: true, run: activate },
    a.load && { key: "load", group: "main", label: t("cards.load"), icon: ArrowDownToLine, primary: true, run: () => onDialog({ kind: "money", txnType: "CARD_LOAD" }) },
    a.unload && { key: "unload", group: "main", label: t("cards.unload"), icon: ArrowUpFromLine, run: () => onDialog({ kind: "money", txnType: "CARD_UNLOAD" }) },
    a.details && { key: "details", group: "main", label: t("cards.showDetails"), icon: Eye, run: () => onDialog({ kind: "details" }) },
    a.pin_change && { key: "pin_change", label: t("cards.changePin"), icon: KeyRound, run: () => onDialog({ kind: "pin", mode: "change" }) },
    a.pin_reset && { key: "pin_reset", label: t("cards.resetPin"), icon: KeyRound, run: () => onDialog({ kind: "pin", mode: "reset" }) },
    a.plastic && { key: "plastic", label: t("cards.orderPlastic"), icon: Truck, run: () => onDialog({ kind: "plastic" }) },
    a.unblock && canMoveTo("ACTIVE") && { key: "unblock", label: t("cards.unblock"), icon: LockOpen, run: () => onDialog({ kind: "status", to: "ACTIVE" }) },
    a.block && canMoveTo("BLOCKED") && { key: "block", label: t("cards.block"), icon: Lock, run: () => onDialog({ kind: "status", to: "BLOCKED" }) },
    a.replace && reasons.length > 0 && { key: "replace", label: t("cards.replace"), icon: RotateCcw, primary: lostOrStolen, run: () => onDialog({ kind: "reissue", reasons }) },
    a.renew && { key: "renew", label: t("cards.renew"), icon: RotateCcw, run: () => onDialog({ kind: "reissue", reasons: ["EXPIRED"] }) },
    a.report && canMoveTo("LOST") && { key: "lost", group: "danger", label: t("cards.reportLost"), icon: ShieldAlert, danger: true, run: () => onDialog({ kind: "status", to: "LOST" }) },
    a.report && canMoveTo("STOLEN") && { key: "stolen", group: "danger", label: t("cards.reportStolen"), icon: ShieldAlert, danger: true, run: () => onDialog({ kind: "status", to: "STOLEN" }) },
  ].filter(Boolean);

  const facts = [
    [t("cards.status"), t(`cards.ops.${card.ops_status}`, { defaultValue: card.ops_status })],
    card.purse_acct_num && [t("cards.cardAccount"), card.purse_acct_num],
    card.funding_acct_num && [t("cards.spendsFrom"), card.funding_acct_num],
    [t("cards.expiry"), card.expiry],
    [t("cards.cardPin"), card.pin_locked ? t("cards.pinLocked") : card.pin_set ? t("cards.pinSetYes") : t("cards.pinNotSet")],
    [t("cards.activation"), t(`cards.activationMode.${card.activation_mode}`, { defaultValue: card.activation_mode })],
    card.plastic_request && [t("cards.plastic"), `${card.plastic_request.request_ref ?? ""} · ${t(`cards.requestStatus.${card.plastic_request.request_status}`, { defaultValue: card.plastic_request.request_status ?? "" })}`],
    offer && Number(offer.held) > 0 && [t("cards.held"), t("cards.heldOf", { held: offer.held, max: offer.max_cards_per_customer })],
  ].filter(Boolean);

  return (
    <section className="min-w-0 lg:sticky lg:top-24">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("cards.detailsTitle")}</h2>
      <div className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <p className="font-mono text-lg font-bold text-slate-800 [overflow-wrap:anywhere]">{card.pan_masked}</p>
          <p className="text-sm text-slate-500">
            {card.product_name} · {card.network_code}
          </p>
        </div>
        {card.ops_status === "PENDING_ACTIVATION" && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">{t(`cards.activateHint.${card.activation_mode}`, { defaultValue: t("cards.ops.PENDING_ACTIVATION") })}</span>}
      </div>
      {problem && (
        <div className="mt-3">
          <ErrorState message={problem} />
        </div>
      )}

      {/* Buttons in tidy equal-width grids: the main actions, the rest of
          what can be done with the card, and (apart) the reports. */}
      {[
        ["main", "mt-6", null],
        ["manage", "mt-6", "cards.manage"],
        ["danger", "mt-6 border-t border-slate-100 pt-5", "cards.somethingWrong"],
      ].map(([group, wrapper, heading]) => {
        const items = buttons.filter((b) => (b.group ?? "manage") === group);
        if (!items.length) return null;
        return (
          <div key={group} className={wrapper}>
            {heading && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{t(heading)}</p>}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,9.5rem),1fr))]">
              {items.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.key}
                    type="button"
                    disabled={busy}
                    onClick={b.run}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl text-center text-sm font-semibold leading-tight transition duration-150 hover:-translate-y-px active:translate-y-0 disabled:opacity-60",
                      group === "main" ? "h-11 px-4 shadow-sm" : "h-10 px-3",
                      b.primary ? "brand-gradient text-white" : b.danger ? "border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10" : group === "main" ? "border border-slate-200 bg-surface text-ink hover:bg-ink/5" : "bg-ink/5 text-ink hover:bg-ink/10",
                    )}
                  >
                    <Icon size={group === "main" ? 16 : 15} className="shrink-0" /> <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <dl className="mt-6 grid gap-3 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-paper/70 px-3.5 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-800 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>

      {card.history?.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("cards.history")}</p>
          <ol className="max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
            {card.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex flex-wrap justify-between gap-x-3">
                <span className="font-semibold text-slate-700">
                  {t(`cards.ops.${h.ops_status}`, { defaultValue: h.ops_status })}
                  <span className="font-normal text-slate-500"> · {t(`cards.by.${h.by}`, { defaultValue: h.by })}</span>
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      </div>
    </section>
  );
}

// Requests for physical cards, with Cancel until the card is ordered.
function Requests({ requests, onDone }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState("");
  const cancel = async (id) => {
    setBusy(id);
    setProblem("");
    try {
      await cancelRequest(id);
      onDone(null, "cancelled");
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("cards.requests")}</h2>
      {problem && (
        <div className="mb-3">
          <ErrorState message={problem} />
        </div>
      )}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-surface">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
              <Truck size={16} />
            </span>
            <span className="min-w-[12rem] flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                {r.product_name} · {t(`cards.requestType.${r.request_type}`, { defaultValue: r.request_type })}
              </span>
              <span className="block text-xs text-slate-500">
                {[r.request_ref, r.name_on_card, t(`cards.deliveryMode.${r.delivery_mode}`, { defaultValue: r.delivery_mode }), Number(r.fee_amount) > 0 && formatMoney(r.fee_amount, r.currency_code), r.fee_refunded && t("cards.feeRefunded")].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink">{t(`cards.requestStatus.${r.request_status}`, { defaultValue: r.request_status })}</span>
            {r.can_cancel && (
              <Button variant="secondary" pending={busy === r.id} onClick={() => void cancel(r.id)} className="px-3 py-2">
                {t("cards.cancelRequest")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// What the merchant can get now, with the fee; "Get" is off once they hold
// the most this product allows.
function Offers({ offers, onGet }) {
  const { t } = useTranslation();
  return (
    <section>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("cards.getACard")}</h2>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
        {offers.map((o) => {
          const full = Number(o.held) >= Number(o.max_cards_per_customer);
          return (
            <div key={o.card_product_id} className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink">
                <CreditCard size={19} />
              </span>
              <p className="text-lg font-bold leading-snug text-slate-800">{o.product_name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">
                {t(`cards.class.${o.product_class}`, { defaultValue: o.product_class })} · {o.currency_code}
              </p>
              {o.description && <p className="mt-3 text-sm leading-6 text-slate-600">{o.description}</p>}
              <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700">{Number(o.new_card_fee) > 0 ? t("cards.feeIs", { fee: formatMoney(o.new_card_fee, o.currency_code) }) : t("cards.noFee")}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("cards.heldOf", { held: o.held ?? 0, max: o.max_cards_per_customer })}</p>
              </div>
              <div className="mt-auto grid gap-2.5 pt-5">
                {o.virtual && (
                  <Button disabled={full} onClick={() => onGet(o, false)} className="w-full px-4 py-3">
                    <Plus size={15} /> {t("cards.getVirtual")}
                  </Button>
                )}
                {o.personalised && (
                  <Button variant="secondary" disabled={full} onClick={() => onGet(o, true)} className="w-full px-4 py-3">
                    <Truck size={15} /> {t("cards.requestPhysical")}
                  </Button>
                )}
              </div>
              {full && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{t("cards.atMost")}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
