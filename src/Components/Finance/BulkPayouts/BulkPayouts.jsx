import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Download, FileCheck2, RotateCcw, Search, Send, Undo2, Upload, XCircle } from "lucide-react";
import Button from "@/Components/Common/Button";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import FilterSelect from "@/Components/Common/FilterSelect";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import PageTitle from "@/Components/Common/PageTitle";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import TextField from "@/Components/Common/TextField";
import { PinInput, Shell } from "@/Components/Common/ActionDialog";
import { useAccountActions } from "@/Hooks/Account/useAccountActions";
import { useBulkPayoutActions } from "@/Hooks/Finance/useBulkPayoutActions";
import { saveBlob } from "@/Utils/Lib/download";
import { formatDateTime, formatMoney, walletLabel } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { isOwnMoney } from "@/Utils/Lib/roles";

const STATUSES = ["ALL", "PENDING", "PROCESSING", "DONE", "REJECTED", "CANCELLED"];
const PAGE_SIZE = 20;
const POLL_MS = 3000;

const saveBase64 = (base64, fileName) => {
  const bytes = Uint8Array.from(atob(base64 ?? ""), (c) => c.charCodeAt(0));
  saveBlob(new Blob([bytes], { type: "text/csv" }), fileName);
};
const fileBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const problemOf = (error) => ({ message: error.message, problems: error.problems, errorCode: error.errorCode });

function StatusChip({ status }) {
  const { t } = useTranslation();
  return <span className="inline-block rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{t(`bulkPayouts.status.${status}`, { defaultValue: status })}</span>;
}

function Rows({ rows, currency }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(25);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            {["row", "payee", "name", "amount", "fee", "status", "reason"].map((k) => (
              <th key={k} className="px-3 py-2 font-semibold">
                {t(`bulkPayouts.col.${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, shown).map((r) => (
            <tr key={r.row_no} className="border-t border-slate-100">
              <td className="px-3 py-2 tabular-nums">{r.row_no}</td>
              <td className="px-3 py-2 font-mono">{[r.payee_account || r.payee_phone, r.bank_provider].filter(Boolean).join(" · ")}</td>
              <td className="px-3 py-2">
                {r.payee_name || r.expected_name || "—"}
                {r.name_check && <span className="block text-[10px] text-slate-400">{t(`bulkPayouts.nameCheck.${r.name_check}`, { defaultValue: r.name_check })}</span>}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatMoney(r.amount, currency)}</td>
              <td className="px-3 py-2 tabular-nums">{r.fee != null ? formatMoney(r.fee, currency) : "—"}</td>
              <td className="px-3 py-2">
                <StatusChip status={r.row_status} />
                {r.rrn && <span className="block font-mono text-[10px] text-slate-400">{r.rrn}</span>}
              </td>
              <td className="px-3 py-2 text-red-700">{r.reason || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown && (
        <Button variant="secondary" onClick={() => setShown((n) => n + 25)} className="mt-2 w-full py-2">
          {t("cases.more")}
        </Button>
      )}
    </div>
  );
}

// Upload: pick the wallet and the file, check it (writes nothing), then file it.
function UploadDialog({ wallets, onClose, onFiled }) {
  const { t } = useTranslation();
  const { template, check, add } = useBulkPayoutActions();
  const [acct, setAcct] = useState(wallets[0]?.acct_num ?? "");
  const [file, setFile] = useState(null);
  const [checked, setChecked] = useState(null);
  const [narration, setNarration] = useState("");
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState("");
  const body = async () => ({ from_acct_num: acct, file_name: file.name, file_base64: await fileBase64(file) });
  const run = (which, fn) => async () => {
    setBusy(which);
    setProblem(null);
    try {
      await fn();
    } catch (error) {
      setProblem(problemOf(error));
    } finally {
      setBusy("");
    }
  };
  const downloadTemplate = run("template", async () => {
    const reply = await template();
    saveBase64(reply?.csv_base64, reply?.file_name ?? "bulk_payout_template.csv");
  });
  const runCheck = run("check", async () => setChecked(await check(await body())));
  const file_ = run("add", async () => {
    const reply = await add({ ...(await body()), narration: narration.trim() });
    notifications.success(reply.message || t("bulkPayouts.filed"));
    onFiled(reply.data?.id);
  });
  const rows = checked?.rows ?? [];
  const totals = checked?.totals;
  const blocked = !checked ? t("bulkPayouts.checkFirst") : checked.duplicate ? checked.duplicate_message || t("bulkPayouts.duplicate") : !totals?.valid_count ? t("bulkPayouts.noValid") : !narration.trim() ? t("bulkPayouts.narrationNeeded") : "";
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={Boolean(busy)} size="xl" title={t("bulkPayouts.upload")} description={t("bulkPayouts.uploadHint")}>
      <div className="grid gap-4">
        {problem && <ErrorState message={problem.message} problems={problem.problems} />}
        <div className="flex justify-end">
          <Button variant="secondary" pending={busy === "template"} onClick={downloadTemplate} className="px-3 py-2">
            <Download size={14} /> {t("bulkPayouts.template")}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterSelect
            label={t("bulkPayouts.fromWallet")}
            value={acct}
            onChange={(value) => {
              setAcct(value);
              setChecked(null);
            }}
            options={wallets.map((w) => ({ value: w.acct_num, label: walletLabel(w) }))}
          />
          <label className="block text-sm font-medium">
            {t("bulkPayouts.file")}
            <input
              type="file"
              accept=".csv,.xlsx"
              className="field-control mt-2 w-full"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setChecked(null);
              }}
            />
          </label>
        </div>
        {checked && (
          <>
            {checked.duplicate && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{checked.duplicate_message || t("bulkPayouts.duplicate")}</p>}
            {totals && (
              <p className="text-xs text-slate-600">
                {t("bulkPayouts.totals", { valid: totals.valid_count, invalid: totals.invalid_count, total: formatMoney(totals.total_debit, totals.currency_code), balance: formatMoney(totals.free_balance, totals.currency_code) })}
                {!totals.funds_ok && <span className="font-semibold text-red-700"> {t("bulkPayouts.noFunds")}</span>}
              </p>
            )}
            <Rows rows={rows} currency={totals?.currency_code} />
            <TextField name="narration" label={t("bulkPayouts.narration")} value={narration} maxLength={500} onChange={(event) => setNarration(event.target.value)} />
          </>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" disabled={Boolean(busy)} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="secondary" pending={busy === "check"} disabled={!acct || !file} reason={t("bulkPayouts.pickFile")} onClick={runCheck}>
            <FileCheck2 size={15} /> {t("bulkPayouts.check")}
          </Button>
          <Button pending={busy === "add"} disabled={Boolean(blocked)} reason={blocked} onClick={file_}>
            <Send size={15} /> {t("bulkPayouts.fileBatch")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// A batch's verb: auth takes the merchant's transaction PIN, deauth a reason.
function VerbDialog({ verb, onClose, onConfirm, pending, problem }) {
  const { t } = useTranslation();
  const [pin, setPin] = useState("");
  const [narration, setNarration] = useState("");
  const needsPin = verb === "auth";
  const needsReason = verb === "deauth";
  const disabled = (needsPin && !pin) || (needsReason && !narration.trim());
  return (
    <Shell title={t(`bulkPayouts.confirm.${verb}`)} description={t(`bulkPayouts.confirmHint.${verb}`)} problem={problem} onClose={onClose} pending={pending} confirm={t(`bulkPayouts.verb.${verb}`)} danger={verb === "deauth"} disabled={disabled} onConfirm={() => onConfirm({ ...(needsPin ? { pin } : {}), ...(narration.trim() ? { narration: narration.trim() } : {}) })}>
      {needsPin && <PinInput label={t("bulkPayouts.pin")} value={pin} onChange={setPin} />}
      <TextField name="narration" label={needsReason ? t("bulkPayouts.reason") : t("bulkPayouts.narrationOptional")} value={narration} maxLength={500} onChange={(event) => setNarration(event.target.value)} />
    </Shell>
  );
}

function BatchView({ id, onBack }) {
  const { t } = useTranslation();
  const api = useBulkPayoutActions();
  const [batch, setBatch] = useState(null);
  const [problem, setProblem] = useState("");
  const [dialog, setDialog] = useState(null);
  const [verbProblem, setVerbProblem] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(id).then(setBatch).catch((error) => setProblem(error.message)), [api, id]);
  useEffect(() => {
    void load();
  }, [load]);
  const processing = batch?.batch_status === "PROCESSING";
  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [processing, load]);
  const act = async (extra) => {
    setBusy(true);
    setVerbProblem(null);
    try {
      const reply = await api.verb(dialog, { id, ...extra });
      if (reply.message) notifications.success(reply.message);
      setDialog(null);
      await load();
    } catch (error) {
      setVerbProblem(problemOf(error));
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    try {
      const file = await api.resultFile(id);
      saveBase64(file?.csv_base64, file?.file_name ?? `bulk_payout_${id}.csv`);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  if (problem) return <ErrorState message={problem} onRetry={() => void load()} />;
  if (!batch) return <LoadingState />;
  const a = batch.actions ?? {};
  const cur = batch.currency_code;
  const done = Number(batch.processed_count ?? 0);
  const todo = Number(batch.to_process_count ?? 0);
  const buttons = [
    a.result_file && <Button key="file" variant="secondary" onClick={() => void download()} className="px-3 py-2"><Download size={14} /> {t("bulkPayouts.resultFile")}</Button>,
    a.cancel && <Button key="cancel" variant="secondary" onClick={() => setDialog("cancel")} className="px-3 py-2"><Undo2 size={14} /> {t("bulkPayouts.verb.cancel")}</Button>,
    a.retry && <Button key="retry" variant="secondary" onClick={() => setDialog("retry")} className="px-3 py-2"><RotateCcw size={14} /> {t("bulkPayouts.verb.retry")}</Button>,
    a.deauth && <Button key="deauth" variant="secondary" onClick={() => setDialog("deauth")} className="px-3 py-2"><XCircle size={14} /> {t("bulkPayouts.verb.deauth")}</Button>,
    a.auth && <Button key="auth" onClick={() => setDialog("auth")} className="px-3 py-2"><CheckCircle2 size={14} /> {t("bulkPayouts.verb.auth")}</Button>,
  ].filter(Boolean);
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink">
        <ArrowLeft size={15} /> {t("bulkPayouts.back")}
      </button>
      <div className="panel mb-4 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-mono text-xl font-black text-slate-800">
              {batch.batch_ref} <StatusChip status={batch.batch_status} />
            </h1>
            <p className="mt-1 text-xs text-slate-500">{[batch.file_name, batch.from_acct_num, batch.narration].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">{buttons}</div>
        </div>
        {processing && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold">{t("bulkPayouts.progress", { done, total: todo })}</p>
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-forest transition-all" style={{ width: `${todo ? Math.min(100, Math.round((done / todo) * 100)) : 0}%` }} />
            </div>
          </div>
        )}
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["totalDebit", formatMoney(batch.total_debit, cur)],
            ["totalAmount", formatMoney(batch.total_amount, cur)],
            ["rows", `${batch.valid_count ?? 0} / ${batch.row_count ?? 0}`],
            ["postedFailed", `${batch.posted_count ?? 0} / ${batch.failed_count ?? 0}`],
            ["createdBy", batch.created_by],
            ["created", formatDateTime(batch.created_time)],
            batch.decided_by && ["decidedBy", batch.decided_by],
            batch.decided_time && ["decided", formatDateTime(batch.decided_time)],
          ]
            .filter(Boolean)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-500">{t(`bulkPayouts.fact.${k}`)}</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{v || "—"}</dd>
              </div>
            ))}
        </dl>
        {batch.decision_narration && <p className="mt-3 text-xs text-slate-500">{batch.decision_narration}</p>}
      </div>
      <div className="panel p-5 shadow-sm">
        <Rows rows={batch.items ?? []} currency={cur} />
      </div>
      {dialog && <VerbDialog verb={dialog} pending={busy} problem={verbProblem} onClose={() => setDialog(null)} onConfirm={(extra) => void act(extra)} />}
    </div>
  );
}

// Finance > Bulk payouts: upload a payout file and follow it while it is
// paid. Each batch's `actions` say what this user may do: a store manager
// may make, cancel and read; only the merchant may authorise, reject or retry.
export default function BulkPayouts() {
  const { t } = useTranslation();
  const { list } = useBulkPayoutActions();
  const { loadWallets } = useAccountActions();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ items: null, total: 0, problem: "" });
  const [openId, setOpenId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [wallets, setWallets] = useState([]);
  useEffect(() => {
    loadWallets()
      .then((rows) => setWallets(rows.filter(isOwnMoney)))
      .catch(() => setWallets([]));
  }, [loadWallets]);
  const load = useCallback(
    async (nextPage, text) => {
      try {
        const reply = await list({ ...(status === "ALL" ? {} : { batch_status: status }), ...(text.trim() ? { search: text.trim() } : {}), page: nextPage, page_size: PAGE_SIZE });
        setState((previous) => ({ items: nextPage === 1 ? reply.items : [...(previous.items ?? []), ...reply.items], total: reply.total, problem: "" }));
      } catch (error) {
        setState((previous) => ({ ...previous, items: previous.items ?? [], problem: error.message }));
      }
    },
    [list, status],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void load(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [load, search]);
  if (openId)
    return (
      <BatchView
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load(1, search);
        }}
      />
    );
  const items = state.items;
  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{t("bulkPayouts.title")}</PageTitle>
          <p className="mt-1 text-sm text-slate-500">{t("bulkPayouts.tagline")}</p>
        </div>
        <Button disabled={!wallets.length} reason={t("bulkPayouts.noWallet")} onClick={() => setUploading(true)} className="px-4 py-2.5">
          <Upload size={16} /> {t("bulkPayouts.upload")}
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs items={STATUSES.map((key) => ({ key, label: key === "ALL" ? t("bulkPayouts.all") : t(`bulkPayouts.status.${key}`) }))} value={status} onChange={setStatus} />
        <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <span className="sr-only">{t("bulkPayouts.search")}</span>
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("bulkPayouts.search")} className="field-control w-full ps-9" />
        </label>
      </div>
      {state.problem && <ErrorState message={state.problem} onRetry={() => void load(1, search)} />}
      {items === null ? (
        <LoadingState />
      ) : !items.length ? (
        <div className="panel shadow-sm">
          <EmptyState icon={Upload} title={t("bulkPayouts.empty")} description={t("bulkPayouts.emptyHint")} />
        </div>
      ) : (
        <ul className="panel divide-y divide-slate-100 shadow-sm">
          {items.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => setOpenId(b.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-ink/[0.03]">
                <span className="min-w-0">
                  <span className="block font-mono text-sm font-bold text-ink">{b.batch_ref}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{[b.file_name, b.narration, formatDateTime(b.created_time)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-slate-800">{formatMoney(b.total_debit, b.currency_code)}</span>
                  <StatusChip status={b.batch_status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items && items.length < state.total && (
        <Button
          variant="secondary"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            void load(next, search);
          }}
          className="mt-4 w-full py-2.5"
        >
          {t("cases.more")}
        </Button>
      )}
      {uploading && (
        <UploadDialog
          wallets={wallets}
          onClose={() => setUploading(false)}
          onFiled={(id) => {
            setUploading(false);
            if (id) setOpenId(id);
            else void load(1, search);
          }}
        />
      )}
    </div>
  );
}
