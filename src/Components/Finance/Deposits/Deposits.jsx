import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { CalendarClock, Plus, Undo2, Vault } from "lucide-react";
import Button from "@/Components/Common/Button";
import DetailRow from "@/Components/Common/DetailRow";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import TextField from "@/Components/Common/TextField";
import { PageHeading } from "@/Components/Common/PageTitle";
import { PinInput, Shell, useCall } from "@/Components/Common/ActionDialog";
import { TransactionPinNotice } from "@/Components/Common/Payments/TransactionPinSetup";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { useFinanceActions } from "@/Hooks/Finance/useFinanceActions";
import { formatDate, formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// Term deposits: the merchant's own. Open one (the money moves at once),
// follow its interest, choose what happens at maturity, ask to close it
// early (staff approve).

const ORDER = ["ACTIVE", "MATURED", "CLOSED", "PREMATURELY_CLOSED"];
const INSTRUCTIONS = ["PAYOUT", "RENEW_PRINCIPAL", "RENEW_PRINCIPAL_AND_INTEREST", "HOLD"];
const amountInput = (value, decimals = 2) => {
  const clean = String(value).replace(/[^\d.]/g, "");
  const [whole, ...rest] = clean.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};
const pct = (value) => (value == null || value === "" ? "—" : `${Number(value)}%`);
const walletLabel = (w) => `${w.acct_num} · ${w.acct_product_name ?? ""} · ${formatMoney(w.avail_bal, w.currency_code)}`;

export default function Deposits() {
  const { loadDeposits, loadDeposit } = useFinanceActions();
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRows((await loadDeposits()) ?? []);
      setProblem("");
    } catch (error) {
      setRows((r) => r ?? []);
      setProblem(error.message);
    }
  }, [loadDeposits]);
  useEffect(() => {
    void refresh();
  }, [refresh, t]);

  const sorted = [...(rows ?? [])].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const selected = sorted.find((d) => d.id === selectedId) ?? sorted[0] ?? null;

  const refreshDetail = useCallback(async (id) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await loadDeposit(id));
    } catch {
      setDetail(null);
    }
  }, [loadDeposit]);
  useEffect(() => {
    void refreshDetail(selected?.id);
  }, [selected?.id, refreshDetail]);

  const done = (what, id) => {
    setDialog(null);
    setNotice(t(`deposits.notice.${what}`));
    if (id) setSelectedId(id);
    void refresh();
    void refreshDetail(id ?? selected?.id);
  };

  const deposit = detail && selected && detail.id === selected.id ? { ...selected, ...detail } : selected;

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading>{t("deposits.title")}</PageHeading>
          <p className="mt-1 text-sm text-slate-500">{t("deposits.subtitle")}</p>
        </div>
        <Button onClick={() => setDialog({ kind: "open" })}>
          <Plus size={16} /> {t("deposits.open")}
        </Button>
      </div>
      <TransactionPinNotice />
      {problem && <ErrorState message={problem} onRetry={() => void refresh()} />}
      {notice && <p className="rounded-2xl border border-emerald-500/40 bg-surface p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{notice}</p>}

      {rows === null ? (
        <p className="text-sm text-slate-500">{t("deposits.loading")}</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-surface">
          <EmptyState icon={Vault} title={t("deposits.empty")} description={t("deposits.emptyHint")} action={<Button onClick={() => setDialog({ kind: "open" })}>{t("deposits.open")}</Button>} />
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <section className="-m-1 grid max-h-[70vh] auto-rows-max gap-3 overflow-y-auto p-1 lg:max-h-[calc(100dvh-12rem)]">
            {sorted.map((d) => (
              <DepositCard key={d.id} deposit={d} selected={selected?.id === d.id} onClick={() => setSelectedId(d.id)} />
            ))}
          </section>
          {deposit && <DepositDetail deposit={deposit} onAction={(kind) => setDialog({ kind, deposit })} />}
        </div>
      )}

      {dialog?.kind === "open" && <OpenDepositDialog onClose={() => setDialog(null)} onDone={(d) => done("opened", d?.id)} />}
      {dialog?.kind === "instruct" && <InstructDialog deposit={dialog.deposit} onClose={() => setDialog(null)} onDone={() => done("instructed")} />}
      {dialog?.kind === "preclose" && <PrecloseDialog deposit={dialog.deposit} onClose={() => setDialog(null)} onDone={() => done("closeRequested")} />}
    </div>
  );
}


// A tenor in the user's words: the product's own label in English (the
// platform's stored text); in another language, built from tenor_days
// ("3 meses", "90 dias"), since the label has no translations yet.
function tenorText(t, label, days) {
  const n = Number(days);
  if (!n || String(i18next.language ?? "en").startsWith("en")) return label ?? (n ? t("deposits.tenorDays", { count: n }) : "—");
  return n % 30 === 0 ? t("deposits.tenorMonths", { count: n / 30 }) : t("deposits.tenorDays", { count: n });
}

function StatusChip({ status }) {
  const { t } = useTranslation();
  const tone = status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : status === "MATURED" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone)}>{t(`deposits.status.${status}`, { defaultValue: status })}</span>;
}

function DepositCard({ deposit: d, selected, onClick }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className={cn("rounded-2xl border bg-surface p-4 text-start transition hover:-translate-y-px", selected ? "border-ink shadow-md" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-800">{d.deposit_product_name ?? d.product_name}</p>
          <p className="font-mono text-[11px] text-slate-500">{d.reference_no}</p>
        </div>
        <StatusChip status={d.status} />
      </div>
      <p className="mt-3 text-xl font-black tabular-nums text-ink">{formatMoney(d.principal, d.currency_code)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {pct(d.annual_rate)} · {t("deposits.maturesOn", { date: formatDate(d.maturity_date) })}
      </p>
    </button>
  );
}

function DepositDetail({ deposit: d, onAction }) {
  const { t } = useTranslation();
  const interest = d.interest ?? {};
  const actions = d.actions ?? {};
  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">{d.deposit_product_name ?? d.product_name}</h2>
          <p className="font-mono text-xs text-slate-500">
            {d.reference_no} · {d.deposit_number}
          </p>
        </div>
        <StatusChip status={d.status} />
      </div>
      <dl>
        <DetailRow label={t("deposits.principal")} strong>
          {formatMoney(d.principal, d.currency_code)}
        </DetailRow>
        <DetailRow label={t("deposits.rate")}>{pct(d.annual_rate)}</DetailRow>
        <DetailRow label={t("deposits.tenor")}>{tenorText(t, d.tenor_label, d.tenor_days)}</DetailRow>
        <DetailRow label={t("deposits.start")}>{formatDate(d.start_date)}</DetailRow>
        <DetailRow label={t("deposits.maturity")}>{formatDate(d.maturity_date)}</DetailRow>
        <DetailRow label={t("deposits.payout")}>{t(`deposits.frequency.${d.interest_payout_frequency}`, { defaultValue: d.interest_payout_frequency })}</DetailRow>
        <DetailRow label={t("deposits.atMaturity")}>{t(`deposits.instruction.${d.maturity_instruction}`, { defaultValue: d.maturity_instruction })}</DetailRow>
        <DetailRow label={t("deposits.fundedFrom")}>{d.funding_acct_num}</DetailRow>
        <DetailRow label={t("deposits.paysInto")}>{d.payout_acct_num}</DetailRow>
        <DetailRow label={t("deposits.interestEarned")}>{formatMoney(interest.accrued_total ?? 0, d.currency_code)}</DetailRow>
        <DetailRow label={t("deposits.interestPaid")}>{formatMoney(interest.paid_total ?? 0, d.currency_code)}</DetailRow>
      </dl>
      {d.closure_requested_at && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t("deposits.closureRequested", { date: formatDateTime(d.closure_requested_at) })}</p>}
      {(actions.instruct || actions.preclose) && (
        <div className="flex flex-wrap gap-2">
          {actions.instruct && (
            <Button variant="secondary" onClick={() => onAction("instruct")}>
              <CalendarClock size={16} /> {t("deposits.changeInstruction")}
            </Button>
          )}
          {actions.preclose && (
            <Button variant="secondary" onClick={() => onAction("preclose")}>
              <Undo2 size={16} /> {t("deposits.closeEarly")}
            </Button>
          )}
        </div>
      )}
      {d.events?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("deposits.history")}</h3>
          <ol className="space-y-1.5">
            {[...d.events].reverse().map((e, i) => (
              <li key={`${e.event}-${i}`} className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">{t(`deposits.event.${e.event}`, { defaultValue: e.event })}</span>
                <span className="text-xs text-slate-500">{formatDateTime(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// Product -> tenor -> amount -> live quote -> accounts -> PIN -> open.
function OpenDepositDialog({ onClose, onDone }) {
  const { depositOffers, depositQuote, openDeposit } = useFinanceActions();
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [offers, setOffers] = useState(null);
  const [loadProblem, setLoadProblem] = useState("");
  const [form, setForm] = useState({ product: "", tenor: "", principal: "", funding: "", payout: "", narration: "" });
  const [pin, setPin] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteProblem, setQuoteProblem] = useState("");

  useEffect(() => {
    depositOffers()
      .then((o) => {
        setOffers(o ?? { wallets: [], products: [] });
        const first = o?.products?.[0];
        if (first) setForm((f) => ({ ...f, product: String(first.deposit_product_id), tenor: first.config?.tenors?.[0]?.id ? String(first.config.tenors[0].id) : "" }));
      })
      .catch((error) => setLoadProblem(error.message));
  }, [depositOffers]);

  const product = offers?.products?.find((p) => String(p.deposit_product_id) === form.product);
  const config = product?.config ?? {};
  const wallets = (offers?.wallets ?? []).filter((w) => !product || w.currency_code === product.currency_code);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const body = product && form.tenor && Number(form.principal) > 0 ? { acct_product_id: product.acct_product_id, tenor_id: Number(form.tenor), principal: form.principal, ...(form.funding ? { funding_acct_id: Number(form.funding) } : {}) } : null;
  const bodyKey = JSON.stringify(body);

  // The rate and maturity for what is typed, as it is typed.
  useEffect(() => {
    setQuote(null);
    setQuoteProblem("");
    if (!bodyKey || bodyKey === "null") return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      depositQuote(JSON.parse(bodyKey))
        .then((q) => !cancelled && setQuote(q))
        .catch((error) => !cancelled && setQuoteProblem(error.message));
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bodyKey, depositQuote]);

  const limits = [Number(config.minimum_principal) > 0 && t("deposits.minimum", { amount: formatMoney(config.minimum_principal, product?.currency_code) }), Number(config.maximum_principal) > 0 && t("deposits.maximum", { amount: formatMoney(config.maximum_principal, product?.currency_code) })].filter(Boolean).join(" · ");

  return (
    <Shell
      title={t("deposits.open")}
      description={t("deposits.openHint")}
      problem={problem ?? (loadProblem ? { message: loadProblem } : null)}
      onClose={onClose}
      pending={pending}
      confirm={t("deposits.openConfirm")}
      disabled={!quote || pin.length < pinMin}
      onConfirm={() => run(async () => onDone(await openDeposit({ ...body, pin, ...(form.payout ? { payout_acct_id: Number(form.payout) } : {}), ...(form.narration.trim() ? { narration: form.narration.trim() } : {}) })))}
    >
      {!offers ? (
        !loadProblem && <p className="text-sm text-slate-500">{t("deposits.loading")}</p>
      ) : offers.limit?.can_open === false || !offers.products?.length ? (
        // limit.reason: NO_PRODUCT (nothing on offer) or NO_ACCOUNT (no
        // active account to pay from or into).
        <p className="text-sm text-slate-500">{t(offers.limit?.reason === "NO_ACCOUNT" ? "deposits.needAccount" : "deposits.noOffers")}</p>
      ) : (
        <>
          <FilterSelect
            label={t("deposits.product")}
            value={form.product}
            onChange={(v) => {
              const p = offers.products.find((x) => String(x.deposit_product_id) === v);
              setForm((f) => ({ ...f, product: v, tenor: p?.config?.tenors?.[0]?.id ? String(p.config.tenors[0].id) : "", funding: "", payout: "" }));
            }}
            options={offers.products.map((p) => ({ value: String(p.deposit_product_id), label: `${p.product_name} (${p.currency_code})` }))}
          />
          <FilterSelect label={t("deposits.tenor")} value={form.tenor} onChange={set("tenor")} options={(config.tenors ?? []).map((x) => ({ value: String(x.id), label: tenorText(t, x.label, x.tenor_days) }))} />
          <div>
            <TextField name="principal" inputMode="decimal" label={t("deposits.amountIn", { currency: product?.currency_code ?? "" })} value={form.principal} onChange={(e) => set("principal")(amountInput(e.target.value, product?.amount_decimals ?? 2))} />
            {limits && <p className="mt-1 text-xs text-slate-500">{limits}</p>}
          </div>
          <FilterSelect label={t("deposits.fundedFrom")} placeholder={t("deposits.mainAccount")} clearable value={form.funding} onChange={set("funding")} options={wallets.map((w) => ({ value: String(w.id), label: walletLabel(w) }))} />
          <FilterSelect label={t("deposits.paysInto")} placeholder={t("deposits.sameAccount")} clearable value={form.payout} onChange={set("payout")} options={wallets.map((w) => ({ value: String(w.id), label: walletLabel(w) }))} />
          {quoteProblem && <p className="text-sm font-semibold text-red-600">{quoteProblem}</p>}
          {quote && (
            <dl className="rounded-2xl bg-ink/5 px-4 py-1">
              <DetailRow label={t("deposits.rate")} strong>
                {pct(quote.annual_rate)}
              </DetailRow>
              <DetailRow label={t("deposits.maturity")}>{formatDate(quote.maturity_date)}</DetailRow>
              <DetailRow label={t("deposits.payout")}>{t(`deposits.frequency.${config.interest_payout_frequency}`, { defaultValue: config.interest_payout_frequency })}</DetailRow>
              {config.early_withdrawal_allowed === false && <DetailRow label={t("deposits.closeEarly")}>{t("deposits.notAllowed")}</DetailRow>}
            </dl>
          )}
          <TextField name="narration" label={t("deposits.note")} maxLength={140} value={form.narration} onChange={(e) => set("narration")(e.target.value)} />
          <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
        </>
      )}
    </Shell>
  );
}

function InstructDialog({ deposit, onClose, onDone }) {
  const { instructDeposit } = useFinanceActions();
  const { t } = useTranslation();
  const { pending, problem, run } = useCall();
  const [instruction, setInstruction] = useState(deposit.maturity_instruction ?? "PAYOUT");
  return (
    <Shell
      title={t("deposits.changeInstruction")}
      description={deposit.status === "MATURED" ? t("deposits.instructNowHint") : t("deposits.instructHint")}
      problem={problem}
      onClose={onClose}
      pending={pending}
      confirm={t("deposits.save")}
      disabled={instruction === deposit.maturity_instruction}
      onConfirm={() => run(async () => onDone(await instructDeposit({ id: deposit.id, instruction })))}
    >
      <FilterSelect label={t("deposits.atMaturity")} value={instruction} onChange={setInstruction} options={INSTRUCTIONS.map((i) => ({ value: i, label: t(`deposits.instruction.${i}`) }))} />
    </Shell>
  );
}

// What closing today pays; a request staff approve (worked out again then).
function PrecloseDialog({ deposit, onClose, onDone }) {
  const { precloseQuote, precloseDeposit } = useFinanceActions();
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [quote, setQuote] = useState(null);
  const [quoteProblem, setQuoteProblem] = useState("");
  const [narration, setNarration] = useState("");
  const [pin, setPin] = useState("");
  useEffect(() => {
    precloseQuote(deposit.id)
      .then(setQuote)
      .catch((error) => setQuoteProblem(error.message));
  }, [deposit.id, precloseQuote]);
  const cur = deposit.currency_code;
  return (
    <Shell
      title={t("deposits.closeEarly")}
      description={t("deposits.closeEarlyHint")}
      problem={problem ?? (quoteProblem ? { message: quoteProblem } : null)}
      onClose={onClose}
      pending={pending}
      danger
      confirm={t("deposits.requestClose")}
      disabled={!quote || pin.length < pinMin}
      onConfirm={() => run(async () => onDone(await precloseDeposit({ id: deposit.id, pin, ...(narration.trim() ? { narration: narration.trim() } : {}) })))}
    >
      {quote && (
        <dl className="rounded-2xl bg-ink/5 px-4 py-1">
          <DetailRow label={t("deposits.principal")}>{formatMoney(quote.principal_amount, cur)}</DetailRow>
          <DetailRow label={t("deposits.interestEarned")}>{formatMoney(quote.interest_earned, cur)}</DetailRow>
          <DetailRow label={t("deposits.interestGivenUp")}>{formatMoney(quote.interest_adjustment_amount, cur)}</DetailRow>
          {Number(quote.tax_withheld) > 0 && <DetailRow label={t("deposits.tax")}>{formatMoney(quote.tax_withheld, cur)}</DetailRow>}
          <DetailRow label={t("deposits.youGet")} strong>
            {formatMoney(quote.total_payout_amount, cur)}
          </DetailRow>
        </dl>
      )}
      <TextField name="narration" label={t("deposits.reason")} maxLength={140} value={narration} onChange={(e) => setNarration(e.target.value)} />
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}
