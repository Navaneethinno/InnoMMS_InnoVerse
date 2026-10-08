import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Hourglass } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import { cancelPhoneTransfer, loadPhoneTransfers } from "@/Services/Account/account.api";
import { notifications } from "@/Utils/Lib/notifications";
import { formatDateTime, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

const STATUS_TEXT = { PENDING: "Waiting for them to join", CLAIMED: "Received", CANCELLED: "You took it back", RETURNED: "Returned to you" };
const PAGE = 20;
// The tabs: what can still be acted on, then everything as a history.
const TABS = [
  { key: "waiting", status: "PENDING", label: ["send.tabWaiting", "Waiting"] },
  { key: "history", status: undefined, label: ["send.tabHistory", "History"] },
];

// One tab's rows, a page at a time: a page shorter than the page size is the last.
function useTransfers(status) {
  const [state, setState] = useState({ rows: [], page: 0, more: false, loading: false });
  const loadPage = useCallback(
    async (page) => {
      setState((previous) => ({ ...previous, loading: true }));
      try {
        const rows = await loadPhoneTransfers({ status, page, limit: PAGE });
        setState((previous) => ({ rows: page === 1 ? rows : [...previous.rows, ...rows], page, more: rows.length >= PAGE, loading: false }));
      } catch {
        setState((previous) => ({ ...previous, loading: false }));
      }
    },
    [status],
  );
  return { ...state, reload: () => loadPage(1), next: () => loadPage(state.page + 1), start: loadPage };
}

// Money sent to numbers that are not customers yet: what is still waiting (it
// can be taken back) and, under "History", what came of all of them. Nothing is
// shown while there is none. `version` is bumped after a payment so a new one
// appears.
export default function PhoneTransfers({ version = 0, onCancelled, className }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("waiting");
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState("");
  const waiting = useTransfers("PENDING");
  const history = useTransfers(undefined);
  const { start: startWaiting } = waiting;
  const { start: startHistory } = history;

  useEffect(() => {
    void startWaiting(1);
    void startHistory(1);
  }, [startWaiting, startHistory, version]);

  const cancel = async (id) => {
    setBusy(id);
    setProblem("");
    try {
      await cancelPhoneTransfer(id);
      notifications.success(t("send.takenBack", { defaultValue: "The money is back in your wallet." }));
      onCancelled?.();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(null);
      void waiting.reload();
      void history.reload();
    }
  };

  if (!waiting.rows.length && !history.rows.length) return null;
  const current = tab === "waiting" ? waiting : history;
  return (
    <section className={cn("mt-8", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("send.waitingTitle", { defaultValue: "Money waiting for a number" })}</h2>
        <div role="tablist" className="inline-flex rounded-xl bg-ink/5 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn("rounded-lg px-4 py-1.5 text-xs font-bold transition", tab === item.key ? "bg-surface text-ink shadow-sm" : "text-slate-500 hover:text-ink")}
            >
              {t(item.label[0], { defaultValue: item.label[1] })}
            </button>
          ))}
        </div>
      </div>
      {problem && (
        <div className="mb-3">
          <ErrorState message={problem} />
        </div>
      )}
      {current.rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 px-6 py-5 text-sm text-slate-500">{t("send.nothingWaiting", { defaultValue: "Nothing is waiting right now." })}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-surface shadow-sm">
          {current.rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                <Hourglass size={16} />
              </span>
              <span className="min-w-[12rem] flex-1">
                <span className="block text-sm font-semibold text-slate-800">
                  {formatMoney(row.amount, row.currency_code)} · {row.phone_number}
                </span>
                <span className="block text-xs text-slate-500">{[formatDateTime(row.created_at), row.note].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-bold text-ink">{t(`send.transferStatus.${row.status}`, { defaultValue: STATUS_TEXT[row.status] ?? row.status })}</span>
              {row.can_cancel && (
                <Button variant="secondary" pending={busy === row.id} onClick={() => void cancel(row.id)} className="px-3 py-2">
                  {t("send.takeBack", { defaultValue: "Take it back" })}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {current.more && (
        <div className="mt-4 text-center">
          <Button variant="secondary" pending={current.loading} onClick={() => void current.next()} className="px-6 py-2.5">
            {t("send.loadMore", { defaultValue: "Show more" })}
          </Button>
        </div>
      )}
    </section>
  );
}
