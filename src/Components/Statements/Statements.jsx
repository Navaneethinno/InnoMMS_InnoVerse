import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, FileText } from "lucide-react";
import Button from "@/Components/Common/Button";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import Modal from "@/Components/Common/Modal";
import { loadWallets } from "@/Services/Account/account.api";
import { downloadStatement, exportHistory, listStatements, loadStatement } from "@/Services/Statements/statements.api";
import { saveBlob } from "@/Utils/Lib/download";
import { formatDate, formatMoney } from "@/Utils/Lib/format";

const LIMIT = 20;
const DAY = 86400000;
const isoDay = (date) => date.toISOString().slice(0, 10);
const dateInput = "field-control h-11 border-ink/25 py-0 focus:border-ink";

// Statements: the ones the bank made (with their lines and a CSV each), and a
// download of the history of any wallet between two dates (up to a year).
export default function Statements() {
  const { t } = useTranslation();
  const [wallets, setWallets] = useState([]);
  const [state, setState] = useState({ loading: true, items: [], error: "", more: false });
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState("");
  const [range, setRange] = useState(() => ({ from: isoDay(new Date(Date.now() - 30 * DAY)), to: isoDay(new Date()), acctNum: "" }));

  const currencyOf = useMemo(() => Object.fromEntries(wallets.map((wallet) => [wallet.acct_num, wallet.currency_code])), [wallets]);

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    try {
      const items = await listStatements({ page: 1, limit: LIMIT * pages });
      setState({ loading: false, items, error: "", more: items.length >= LIMIT * pages });
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error.message }));
    }
  }, [pages]);
  useEffect(() => {
    void load();
  }, [load, t]);
  useEffect(() => {
    loadWallets().then(setWallets).catch(() => {});
  }, []);

  const save = async (key, call, fallbackName) => {
    setBusy(key);
    setProblem("");
    try {
      const { blob, filename } = await call();
      saveBlob(blob, filename || fallbackName);
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(null);
    }
  };
  const exportRange = (event) => {
    event.preventDefault();
    const days = (new Date(range.to) - new Date(range.from)) / DAY;
    if (!range.from || !range.to || days < 0 || days > 366) return setProblem(t("statements.rangeInvalid"));
    void save("export", () => exportHistory(range), `history-${range.from}-${range.to}.csv`);
  };
  const open = async (statement) => {
    setDetail({ statement, lines: [], loading: true, error: "" });
    try {
      const full = await loadStatement(statement.id);
      setDetail({ statement: { ...statement, ...full }, lines: full?.lines ?? [], loading: false, error: "" });
    } catch (error) {
      setDetail((previous) => ({ ...previous, loading: false, error: error.message }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("statements.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("statements.subtitle")}</p>
      </div>
      {problem && (
        <div className="mb-5">
          <ErrorState message={problem} />
        </div>
      )}

      <form onSubmit={exportRange} className="mb-8 rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">{t("statements.exportTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("statements.exportHint")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] lg:items-end">
          <FilterSelect
            label={t("history.wallet")}
            value={range.acctNum}
            onChange={(value) => setRange((previous) => ({ ...previous, acctNum: value }))}
            options={wallets.map((wallet) => ({ value: wallet.acct_num, label: `${wallet.acct_product_name ?? wallet.acct_num} · ${wallet.acct_num}` }))}
            placeholder={t("history.allWallets")}
            clearable
            className="h-11 border-ink/25 py-0"
          />
          <label className="block text-sm font-medium">
            <span className="mb-2 block">{t("history.from")}</span>
            <input type="date" value={range.from} max={range.to || undefined} onChange={(event) => setRange((previous) => ({ ...previous, from: event.target.value }))} className={dateInput} />
          </label>
          <label className="block text-sm font-medium">
            <span className="mb-2 block">{t("history.to")}</span>
            <input type="date" value={range.to} min={range.from || undefined} onChange={(event) => setRange((previous) => ({ ...previous, to: event.target.value }))} className={dateInput} />
          </label>
          <Button type="submit" pending={busy === "export"} className="h-11 py-0">
            <Download size={15} /> {t("statements.downloadCsv")}
          </Button>
        </div>
      </form>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">{t("statements.yourStatements")}</h2>
      {state.error && <ErrorState message={state.error} onRetry={() => void load()} />}
      {state.loading && !state.items.length ? (
        <div className="space-y-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : state.items.length === 0 && !state.error ? (
        <div className="rounded-2xl border border-slate-200 bg-surface">
          <EmptyState icon={FileText} title={t("statements.empty")} description={t("statements.emptyHint")} />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-surface shadow-sm">
          {state.items.map((statement) => {
            const currency = currencyOf[statement.acct_num];
            return (
              <li key={statement.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                  <FileText size={17} />
                </span>
                <span className="min-w-[14rem] flex-1">
                  <span className="block text-sm font-bold text-slate-800">
                    {formatDate(statement.period_from)} – {formatDate(statement.period_to)}
                  </span>
                  <span className="block break-all text-xs text-slate-500">
                    {statement.acct_num} · {t("statements.lines", { count: statement.txn_count ?? 0 })}
                  </span>
                </span>
                <span className="text-right text-xs text-slate-500">
                  <span className="block">{t("statements.closing")}</span>
                  <span className="block text-sm font-bold text-slate-800">{formatMoney(statement.closing_balance, currency)}</span>
                </span>
                <span className="flex gap-2">
                  <Button variant="secondary" onClick={() => void open(statement)} className="px-3 py-2">
                    <Eye size={15} /> {t("statements.view")}
                  </Button>
                  <Button variant="secondary" pending={busy === `s${statement.id}`} onClick={() => void save(`s${statement.id}`, () => downloadStatement(statement.id), `statement-${statement.id}.csv`)} className="px-3 py-2">
                    <Download size={15} /> CSV
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {state.more && (
        <div className="mt-5 text-center">
          <Button variant="secondary" pending={state.loading} onClick={() => setPages((value) => value + 1)}>
            {t("inbox.more")}
          </Button>
        </div>
      )}

      <Modal
        open={Boolean(detail)}
        onOpenChange={(next) => !next && setDetail(null)}
        size="lg"
        title={detail ? `${formatDate(detail.statement.period_from)} – ${formatDate(detail.statement.period_to)}` : ""}
        description={detail?.statement.acct_num}
      >
        {detail && <StatementDetail detail={detail} currency={currencyOf[detail.statement.acct_num]} />}
      </Modal>
    </div>
  );
}

function StatementDetail({ detail, currency }) {
  const { t } = useTranslation();
  const { statement, lines, loading, error } = detail;
  const figures = [
    [t("statements.opening"), statement.opening_balance],
    [t("statements.credits"), statement.total_credits],
    [t("statements.debits"), statement.total_debits],
    [t("statements.closing"), statement.closing_balance],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-paper/70 px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-bold text-slate-800">{formatMoney(value, currency)}</dd>
          </div>
        ))}
      </dl>
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}
      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-200/60" />
      ) : (
        <ul className="mt-4 max-h-[45vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {lines.map((line, index) => (
            <li key={`${line.rrn}-${index}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
              <span className="min-w-[10rem] flex-1">
                <span className="block font-semibold text-slate-800 [overflow-wrap:anywhere]">{line.description}</span>
                <span className="block text-xs text-slate-500">{formatDate(line.date)}</span>
              </span>
              <span className="text-right">
                <span className={`block font-bold ${Number(line.amount) < 0 ? "text-slate-800" : "text-emerald-600 dark:text-emerald-400"}`}>{formatMoney(line.amount, currency, { signed: true })}</span>
                <span className="block text-xs text-slate-500">{formatMoney(line.balance, currency)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
