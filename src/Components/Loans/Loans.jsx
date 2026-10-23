import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgePercent, Banknote, CheckCheck, Plus, Undo2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import CheckboxPill from "@/Components/Common/CheckboxPill";
import DetailRow from "@/Components/Common/DetailRow";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import { PageHeading } from "@/Components/Common/PageTitle";
import { PinInput, Shell, useCall } from "@/Components/Common/ActionDialog";
import { TransactionPinNotice } from "@/Components/Common/Payments/TransactionPinSetup";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { applyLoan, loadApplication, loadApplications, loadLoan, loadLoans, loanOffers, loanQuote, repayLoan, settleLoan, settlementQuote, withdrawApplication } from "@/Services/Finance/finance.api";
import { formatDate, formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// Loans: the merchant's own. See an exact offer and apply (accepting it);
// follow the application; once paid out, see what is due, repay it, or pay
// the loan off early.

const OPEN_LOAN = ["DELINQUENT", "ACTIVE", "PENDING_DISBURSEMENT"];
const amountInput = (value, decimals = 2) => {
  const clean = String(value).replace(/[^\d.]/g, "");
  const [whole, ...rest] = clean.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};
const pct = (value) => (value == null || value === "" ? "—" : `${Number(value)}%`);
const walletLabel = (w) => `${w.acct_num} · ${w.acct_product_name ?? ""} · ${formatMoney(w.avail_bal, w.currency_code)}`;
const termText = (t, value, unit) => t(`loans.unit.${unit}`, { count: Number(value), defaultValue: `${value} ${unit ?? ""}` });

export default function Loans() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("loans");
  const [loans, setLoans] = useState(null);
  const [applications, setApplications] = useState(null);
  const [selected, setSelected] = useState(null); // { kind: loan | application, id }
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [l, a] = await Promise.all([loadLoans(), loadApplications()]);
      setLoans(l ?? []);
      setApplications(a ?? []);
      setProblem("");
    } catch (error) {
      setLoans((x) => x ?? []);
      setApplications((x) => x ?? []);
      setProblem(error.message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh, t]);

  const sortedLoans = [...(loans ?? [])].sort((a, b) => {
    const rank = (s) => (OPEN_LOAN.includes(s) ? OPEN_LOAN.indexOf(s) : OPEN_LOAN.length);
    return rank(a.status) - rank(b.status);
  });
  const list = tab === "loans" ? sortedLoans : (applications ?? []);
  const current = list.find((x) => selected?.kind === tab && x.id === selected.id) ?? list[0] ?? null;

  const refreshDetail = useCallback(async (kind, id) => {
    if (!id) return setDetail(null);
    try {
      setDetail({ kind, ...(await (kind === "loans" ? loadLoan(id) : loadApplication(id))) });
    } catch {
      setDetail(null);
    }
  }, []);
  useEffect(() => {
    void refreshDetail(tab, current?.id);
  }, [tab, current?.id, refreshDetail]);

  const done = (what, next) => {
    setDialog(null);
    setNotice(t(`loans.notice.${what}`));
    if (next) {
      setTab(next.kind);
      setSelected(next);
    }
    void refresh();
    void refreshDetail(next?.kind ?? tab, next?.id ?? current?.id);
  };

  const shown = detail && current && detail.kind === tab && detail.id === current.id ? { ...current, ...detail } : current;
  const empty = tab === "loans" ? loans !== null && sortedLoans.length === 0 : applications !== null && (applications ?? []).length === 0;

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading>{t("loans.title")}</PageHeading>
          <p className="mt-1 text-sm text-slate-500">{t("loans.subtitle")}</p>
        </div>
        <Button onClick={() => setDialog({ kind: "apply" })}>
          <Plus size={16} /> {t("loans.apply")}
        </Button>
      </div>
      <TransactionPinNotice />
      {problem && <ErrorState message={problem} onRetry={() => void refresh()} />}
      {notice && <p className="rounded-2xl border border-emerald-500/40 bg-surface p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{notice}</p>}

      <SegmentedTabs
        items={[
          { key: "loans", label: t("loans.myLoans") },
          { key: "applications", label: t("loans.applications") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loans === null ? (
        <p className="text-sm text-slate-500">{t("loans.loading")}</p>
      ) : empty ? (
        <div className="rounded-3xl border border-slate-200 bg-surface">
          <EmptyState icon={BadgePercent} title={t(tab === "loans" ? "loans.noLoans" : "loans.noApplications")} description={t("loans.emptyHint")} action={<Button onClick={() => setDialog({ kind: "apply" })}>{t("loans.apply")}</Button>} />
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <section className="-m-1 grid max-h-[70vh] auto-rows-max gap-3 overflow-y-auto p-1 lg:max-h-[calc(100dvh-12rem)]">
            {list.map((x) => (
              <ItemCard key={x.id} item={x} kind={tab} selected={current?.id === x.id} onClick={() => setSelected({ kind: tab, id: x.id })} />
            ))}
          </section>
          {shown &&
            (tab === "loans" ? (
              <LoanDetail loan={shown} onAction={(kind) => setDialog({ kind, loan: shown })} />
            ) : (
              <ApplicationDetail application={shown} onOpenLoan={(id) => {
                  setTab("loans");
                  setSelected({ kind: "loans", id });
                }} onWithdraw={() => setDialog({ kind: "withdraw", application: shown })} />
            ))}
        </div>
      )}

      {dialog?.kind === "apply" && <ApplyDialog onClose={() => setDialog(null)} onDone={(a) => done("applied", a?.id ? { kind: "applications", id: a.id } : null)} />}
      {dialog?.kind === "withdraw" && <WithdrawDialog application={dialog.application} onClose={() => setDialog(null)} onDone={() => done("withdrawn")} />}
      {dialog?.kind === "repay" && <RepayDialog loan={dialog.loan} onClose={() => setDialog(null)} onDone={() => done("repaid")} />}
      {dialog?.kind === "settle" && <SettleDialog loan={dialog.loan} onClose={() => setDialog(null)} onDone={() => done("settled")} />}
    </div>
  );
}

function StatusChip({ status, kind }) {
  const { t } = useTranslation();
  const tone = ["ACTIVE", "APPROVED", "CONVERTED", "SETTLED"].includes(status)
    ? "bg-emerald-50 text-emerald-700"
    : ["DELINQUENT", "DECLINED", "WRITTEN_OFF"].includes(status)
      ? "bg-red-50 text-red-700"
      : ["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "PENDING_DISBURSEMENT"].includes(status)
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone)}>{t(`loans.${kind === "loans" ? "status" : "appStatus"}.${status}`, { defaultValue: status })}</span>;
}

function ItemCard({ item: x, kind, selected, onClick }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className={cn("rounded-2xl border bg-surface p-4 text-start transition hover:-translate-y-px", selected ? "border-ink shadow-md" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-800">{x.product_name}</p>
          <p className="font-mono text-[11px] text-slate-500">{kind === "loans" ? x.facility_number : x.application_number}</p>
        </div>
        <StatusChip status={x.status} kind={kind} />
      </div>
      <p className="mt-3 text-xl font-black tabular-nums text-ink">{formatMoney(kind === "loans" ? x.principal : x.amount, x.currency_code)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {pct(x.annual_rate)} · {termText(t, x.term_value, x.term_unit)}
        {kind === "loans" && x.status === "DELINQUENT" && Number(x.days_past_due) > 0 && <span className="font-bold text-red-600"> · {t("loans.daysLate", { count: Number(x.days_past_due) })}</span>}
      </p>
    </button>
  );
}

function Schedule({ rows, currency, paidColumn }) {
  const { t } = useTranslation();
  if (!rows?.length) return null;
  return (
    <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface text-start text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">{t("loans.dueDate")}</th>
            <th className="px-3 py-2 text-end">{t("loans.principal")}</th>
            <th className="px-3 py-2 text-end">{t("loans.interest")}</th>
            <th className="px-3 py-2 text-end">{t("loans.instalment")}</th>
            {paidColumn && <th className="px-3 py-2 text-end">{t("loans.paid")}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {rows.map((r) => (
            <tr key={r.installment_number}>
              <td className="px-3 py-1.5">{r.installment_number}</td>
              <td className="px-3 py-1.5">{formatDate(r.due_date)}</td>
              <td className="px-3 py-1.5 text-end">{formatMoney(r.principal_due, currency)}</td>
              <td className="px-3 py-1.5 text-end">{formatMoney(r.interest_due, currency)}</td>
              <td className="px-3 py-1.5 text-end font-semibold">{formatMoney(r.total_due, currency)}</td>
              {paidColumn && <td className="px-3 py-1.5 text-end">{formatMoney(r.paid, currency)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoanDetail({ loan: l, onAction }) {
  const { t } = useTranslation();
  const due = l.due ?? {};
  const actions = l.actions ?? {};
  const cur = l.currency_code;
  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">{l.product_name}</h2>
          <p className="font-mono text-xs text-slate-500">{l.facility_number}</p>
        </div>
        <StatusChip status={l.status} kind="loans" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["dueNow", formatMoney(due.total_due ?? 0, cur), Number(due.total_due) > 0],
          ["nextPayment", due.next_due_date ? `${formatMoney(due.next_amount, cur)} · ${formatDate(due.next_due_date)}` : "—"],
          ["stillOwed", formatMoney(due.total_outstanding ?? 0, cur)],
        ].map(([key, value, alert]) => (
          <div key={key} className={cn("rounded-2xl border p-3", alert ? "border-red-200 bg-red-50" : "border-slate-200")}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t(`loans.${key}`)}</p>
            <p className={cn("mt-1 text-sm font-black tabular-nums", alert ? "text-red-700" : "text-ink")}>{value}</p>
          </div>
        ))}
      </div>
      {(actions.repay || actions.settle) && (
        <div className="flex flex-wrap gap-2">
          {actions.repay && (
            <Button onClick={() => onAction("repay")}>
              <Banknote size={16} /> {t("loans.pay")}
            </Button>
          )}
          {actions.settle && (
            <Button variant="secondary" onClick={() => onAction("settle")}>
              <CheckCheck size={16} /> {t("loans.payOff")}
            </Button>
          )}
        </div>
      )}
      {l.auto_debit_enabled && <p className="text-xs text-slate-500">{t("loans.autoDebit", { account: l.repayment_acct_num })}</p>}
      <dl>
        <DetailRow label={t("loans.principal")}>{formatMoney(l.principal, cur)}</DetailRow>
        <DetailRow label={t("loans.received")}>{formatMoney(l.net_disbursed, cur)}</DetailRow>
        <DetailRow label={t("loans.rate")}>{pct(l.annual_rate)}</DetailRow>
        <DetailRow label={t("loans.term")}>{termText(t, l.term_value, l.term_unit)}</DetailRow>
        <DetailRow label={t("loans.paidOut")}>{formatDate(l.disbursement_date)}</DetailRow>
        <DetailRow label={t("loans.maturity")}>{formatDate(l.maturity_date)}</DetailRow>
        <DetailRow label={t("loans.repaidFrom")}>{l.repayment_acct_num}</DetailRow>
      </dl>
      <Schedule rows={l.schedule} currency={cur} paidColumn />
    </section>
  );
}

function Disclosure({ d, currency }) {
  const { t } = useTranslation();
  const cur = currency ?? d?.currency;
  if (!d) return null;
  const first = d.schedule?.installments?.[0];
  return (
    <div className="space-y-3">
      <dl className="rounded-2xl bg-ink/5 px-4 py-1">
        {first && (
          <DetailRow label={t("loans.instalmentOf", { count: d.schedule.installment_count })} strong>
            {formatMoney(first.total_due, cur)}
          </DetailRow>
        )}
        <DetailRow label={t("loans.rate")}>{pct(d.annual_rate)}</DetailRow>
        {(d.fees ?? []).map((f) => (
          <DetailRow key={f.fee_code} label={f.fee_name ?? f.fee_code}>
            {formatMoney(f.amount, cur)}
          </DetailRow>
        ))}
        <DetailRow label={t("loans.received")}>{formatMoney(d.net_disbursed, cur)}</DetailRow>
        <DetailRow label={t("loans.costOfCredit")}>{formatMoney(d.total_cost_of_credit, cur)}</DetailRow>
        <DetailRow label={t("loans.totalToRepay")} strong>
          {formatMoney(d.total_payable, cur)}
        </DetailRow>
      </dl>
      <Schedule rows={d.schedule?.installments} currency={cur} />
    </div>
  );
}

function ApplicationDetail({ application: a, onOpenLoan, onWithdraw }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">{a.product_name}</h2>
          <p className="font-mono text-xs text-slate-500">{a.application_number}</p>
        </div>
        <StatusChip status={a.status} kind="applications" />
      </div>
      <dl>
        <DetailRow label={t("loans.amount")}>{formatMoney(a.amount, a.currency_code)}</DetailRow>
        <DetailRow label={t("loans.term")}>{termText(t, a.term_value, a.term_unit)}</DetailRow>
        <DetailRow label={t("loans.purpose")}>{a.purpose_description || "—"}</DetailRow>
        <DetailRow label={t("loans.submitted")}>{formatDateTime(a.submitted_at)}</DetailRow>
        {a.decided_at && <DetailRow label={t("loans.decided")}>{formatDateTime(a.decided_at)}</DetailRow>}
      </dl>
      <div className="flex flex-wrap gap-2">
        {a.status === "CONVERTED" && a.facility_id && (
          <Button variant="secondary" onClick={() => onOpenLoan(a.facility_id)}>
            {t("loans.openLoan")}
          </Button>
        )}
        {a.actions?.withdraw && (
          <Button variant="secondary" onClick={onWithdraw}>
            <Undo2 size={16} /> {t("loans.withdraw")}
          </Button>
        )}
      </div>
      {a.disclosure && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("loans.acceptedOffer")}</h3>
          <Disclosure d={a.disclosure} currency={a.currency_code} />
        </div>
      )}
    </section>
  );
}

// Product, term, amount and purpose -> the exact offer -> accept -> PIN.
// An eligibility rule that isn't met refuses the quote (and apply) with a
// message saying which; it shows in the dialog.
function ApplyDialog({ onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [offers, setOffers] = useState(null);
  const [loadProblem, setLoadProblem] = useState("");
  const [form, setForm] = useState({ product: "", term: "", amount: "", purpose_code: "", purpose_description: "", monthly_income: "", operating_months: "", disbursement: "", repayment: "" });
  const [quote, setQuote] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    loanOffers()
      .then((o) => {
        setOffers(o ?? { wallets: [], products: [] });
        const first = o?.products?.[0];
        if (first) setForm((f) => ({ ...f, product: String(first.loan_product_id), term: first.config?.terms?.[0]?.id ? String(first.config.terms[0].id) : "" }));
      })
      .catch((error) => setLoadProblem(error.message));
  }, []);

  const product = offers?.products?.find((p) => String(p.loan_product_id) === form.product);
  const config = product?.config ?? {};
  const term = config.terms?.find((x) => String(x.id) === form.term);
  const rules = config.eligibility_rules ?? {};
  // What this merchant must enter for the product (the server decides).
  const asksIncome = Boolean(product?.asks?.monthly_income);
  const asksMonths = Boolean(product?.asks?.operating_months);
  const purposes = offers?.purposes ?? [];
  const wallets = (offers?.wallets ?? []).filter((w) => !product || w.currency_code === product.currency_code);
  const change = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    // A changed request needs a new offer (and a new acceptance).
    setQuote(null);
    setAccepted(false);
  };
  const body = product && term && Number(form.amount) > 0 && form.purpose_code && form.purpose_description.trim()
    ? {
        loan_product_id: product.loan_product_id,
        term_id: term.id,
        amount: form.amount,
        purpose_code: form.purpose_code,
        purpose_description: form.purpose_description.trim(),
        ...(asksIncome && form.monthly_income ? { monthly_income: form.monthly_income } : {}),
        ...(asksMonths && form.operating_months ? { operating_months: Number(form.operating_months) } : {}),
        ...(form.disbursement ? { disbursement_acct_id: Number(form.disbursement) } : {}),
        ...(form.repayment ? { repayment_acct_id: Number(form.repayment) } : {}),
      }
    : null;

  return (
    <Shell
      size="lg"
      title={t("loans.apply")}
      description={quote ? t("loans.offerHint") : t("loans.applyHint")}
      problem={problem ?? (loadProblem ? { message: loadProblem } : null)}
      onClose={onClose}
      pending={pending}
      confirm={quote ? t("loans.applyConfirm") : t("loans.seeOffer")}
      disabled={!body || (quote && (!accepted || pin.length < pinMin))}
      onConfirm={() => run(async () => (quote ? onDone(await applyLoan({ ...body, accept_terms: true, pin })) : setQuote(await loanQuote(body))))}
    >
      {!offers ? (
        !loadProblem && <p className="text-sm text-slate-500">{t("loans.loading")}</p>
      ) : offers.limit?.can_open === false || !offers.products?.length ? (
        // limit.reason: NO_PRODUCT (nothing on offer) or NO_ACCOUNT (no
        // active account to pay from or into).
        <p className="text-sm text-slate-500">{t(offers.limit?.reason === "NO_ACCOUNT" ? "loans.needAccount" : "loans.noOffers")}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterSelect
              label={t("loans.product")}
              value={form.product}
              onChange={(v) => {
                const p = offers.products.find((x) => String(x.loan_product_id) === v);
                change({ product: v, term: p?.config?.terms?.[0]?.id ? String(p.config.terms[0].id) : "", disbursement: "", repayment: "" });
              }}
              options={offers.products.map((p) => ({ value: String(p.loan_product_id), label: `${p.config?.product_name ?? p.product_code} (${p.currency_code})` }))}
            />
            <FilterSelect label={t("loans.term")} value={form.term} onChange={(v) => change({ term: v })} options={(config.terms ?? []).map((x) => ({ value: String(x.id), label: termText(t, x.term_value, x.term_unit) }))} />
          </div>
          {config.description && <p className="text-xs text-slate-500">{config.description}</p>}
          <div>
            <TextField name="amount" inputMode="decimal" label={t("loans.amountIn", { currency: product?.currency_code ?? "" })} value={form.amount} onChange={(e) => change({ amount: amountInput(e.target.value, product?.amount_decimals ?? 2) })} />
            {term && <p className="mt-1 text-xs text-slate-500">{t("loans.range", { from: formatMoney(term.minimum_amount, product.currency_code), to: Number(term.maximum_amount) > 0 ? formatMoney(term.maximum_amount, product.currency_code) : t("loans.noLimit") })}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterSelect label={t("loans.purpose")} value={form.purpose_code} onChange={(v) => change({ purpose_code: v })} placeholder={t("loans.choosePurpose")} options={purposes.map((p) => ({ value: p.code, label: p.label ?? p.code }))} />
            <TextField name="purpose_description" label={t("loans.purposeDetail")} maxLength={200} value={form.purpose_description} onChange={(e) => change({ purpose_description: e.target.value })} />
            {asksIncome && <TextField name="monthly_income" inputMode="decimal" label={t("loans.monthlyIncome")} value={form.monthly_income} onChange={(e) => change({ monthly_income: amountInput(e.target.value) })} />}
            {asksMonths && <TextField name="operating_months" inputMode="numeric" label={t("loans.operatingMonths")} value={form.operating_months} onChange={(e) => change({ operating_months: e.target.value.replace(/\D/g, "").slice(0, 4) })} />}
            <FilterSelect label={t("loans.paidInto")} placeholder={t("loans.mainAccount")} clearable value={form.disbursement} onChange={(v) => change({ disbursement: v })} options={wallets.map((w) => ({ value: String(w.id), label: walletLabel(w) }))} />
            <FilterSelect label={t("loans.repaidFrom")} placeholder={t("loans.sameAccount")} clearable value={form.repayment} onChange={(v) => change({ repayment: v })} options={wallets.map((w) => ({ value: String(w.id), label: walletLabel(w) }))} />
          </div>
          {(rules.individual || rules.corporate) && (
            <div className="rounded-2xl border border-slate-200 p-3 text-xs text-slate-600">
              <p className="mb-1 font-bold text-slate-700">{t("loans.whoCanApply")}</p>
              {rules.individual?.minimum_age && <p>{t("loans.ageRange", { from: rules.individual.minimum_age, to: rules.individual.maximum_age ?? "—" })}</p>}
              {rules.individual?.minimum_monthly_income && <p>{t("loans.minIncome", { amount: formatMoney(rules.individual.minimum_monthly_income, product.currency_code) })}</p>}
              {rules.corporate?.minimum_operating_months && <p>{t("loans.minMonths", { count: Number(rules.corporate.minimum_operating_months) })}</p>}
            </div>
          )}
          {quote && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("loans.yourOffer")}</h3>
              <Disclosure d={quote.disclosure} />
              <CheckboxPill label={t("loans.acceptTerms")} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
            </>
          )}
        </>
      )}
    </Shell>
  );
}

function WithdrawDialog({ application, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [pin, setPin] = useState("");
  return (
    <Shell title={t("loans.withdraw")} description={t("loans.withdrawHint")} problem={problem} onClose={onClose} pending={pending} danger confirm={t("loans.withdraw")} disabled={pin.length < pinMin} onConfirm={() => run(async () => onDone(await withdrawApplication({ id: application.id, pin })))}>
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}

// Pays what is due now (or part of it). Paying ahead is pay off.
function RepayDialog({ loan, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const due = loan.due?.total_due ?? "";
  const [amount, setAmount] = useState(Number(due) > 0 ? String(due) : "");
  const [pin, setPin] = useState("");
  return (
    <Shell
      title={t("loans.pay")}
      description={t("loans.payHint", { amount: formatMoney(due || 0, loan.currency_code) })}
      problem={problem}
      onClose={onClose}
      pending={pending}
      confirm={t("loans.pay")}
      disabled={pin.length < pinMin || !(Number(amount) > 0)}
      onConfirm={() => run(async () => onDone(await repayLoan({ id: loan.id, amount, pin })))}
    >
      <TextField name="amount" inputMode="decimal" label={t("loans.amountIn", { currency: loan.currency_code })} value={amount} onChange={(e) => setAmount(amountInput(e.target.value))} />
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}

// Clearing the loan today: the quote's total is sent back, so a changed
// amount is refused (then a new quote is fetched).
function SettleDialog({ loan, onClose, onDone }) {
  const { t } = useTranslation();
  const { entryMin: pinMin } = usePinRules();
  const { pending, problem, run } = useCall();
  const [quote, setQuote] = useState(null);
  const [quoteProblem, setQuoteProblem] = useState("");
  const [pin, setPin] = useState("");
  const fetchQuote = useCallback(() => {
    setQuote(null);
    settlementQuote(loan.id)
      .then(setQuote)
      .catch((error) => setQuoteProblem(error.message));
  }, [loan.id]);
  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);
  const cur = loan.currency_code;
  const settle = async () => {
    const paid = await run(async () => {
      onDone(await settleLoan({ id: loan.id, expected_total: quote.total, pin }));
      return true;
    });
    // A refusal (the amount may have changed): show the latest quote.
    if (!paid) fetchQuote();
  };
  return (
    <Shell title={t("loans.payOff")} description={t("loans.payOffHint")} problem={problem ?? (quoteProblem ? { message: quoteProblem } : null)} onClose={onClose} pending={pending} confirm={t("loans.payOffConfirm")} disabled={!quote || pin.length < pinMin} onConfirm={() => void settle()}>
      {quote && (
        <dl className="rounded-2xl bg-ink/5 px-4 py-1">
          <DetailRow label={t("loans.principal")}>{formatMoney(quote.principal, cur)}</DetailRow>
          <DetailRow label={t("loans.interest")}>{formatMoney(quote.interest, cur)}</DetailRow>
          {Number(quote.fees) > 0 && <DetailRow label={t("loans.fees")}>{formatMoney(quote.fees, cur)}</DetailRow>}
          {Number(quote.penalty) > 0 && <DetailRow label={t("loans.penalty")}>{formatMoney(quote.penalty, cur)}</DetailRow>}
          {Number(quote.prepayment_charge) > 0 && <DetailRow label={t("loans.prepaymentCharge")}>{formatMoney(quote.prepayment_charge, cur)}</DetailRow>}
          <DetailRow label={t("loans.total")} strong>
            {formatMoney(quote.total, cur)}
          </DetailRow>
          {Number(quote.interest_waived) > 0 && <DetailRow label={t("loans.youSave")}>{formatMoney(quote.interest_waived, cur)}</DetailRow>}
        </dl>
      )}
      <PinInput label={t("cards.transactionPin")} value={pin} onChange={setPin} />
    </Shell>
  );
}
