import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import Button from "@/Components/Common/Button";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { ShowMore } from "@/Components/Common/ListControls";
import { useListControls } from "@/Hooks/Common/useListControls";
import { useAgentActions } from "@/Hooks/Agents/useAgentActions";
import { formatDate, newReference } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";

// Instant cards the agent holds (agent/cards) and issuing one to a customer
// (agent/card_issue): the customer gives their one-time POS code.
function IssueDialog({ card, onClose, onIssued }) {
  const { issueAgentCard } = useAgentActions();
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [reference] = useState(newReference);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const [issued, setIssued] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      const reply = await issueAgentCard({ inventory_id: card.inventory_id, payment_code: code.trim(), client_reference: reference });
      notifications.success(reply?.message || t("agentCards.issued"));
      setIssued(reply?.data ?? {});
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  if (issued)
    return (
      <Modal open onOpenChange={(open) => !open && onIssued()} title={t("agentCards.issuedTitle")}>
        <dl className="grid gap-2 text-sm">
          {[
            ["agentCards.cardNumber", issued.pan_masked],
            ["agentCards.product", issued.product_name ?? issued.product_code],
            ["agentCards.nameOnCard", issued.name_on_card],
            ["agentCards.expiry", issued.expiry],
            ["agentCards.status", issued.ops_status],
          ].map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <dt className="text-slate-500">{t(key)}</dt>
              <dd className="font-semibold text-slate-800">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex justify-end">
          <Button onClick={onIssued}>{t("agentCards.done")}</Button>
        </div>
      </Modal>
    );
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={pending} title={t("agentCards.issueTitle")} description={t("agentCards.issueHint")}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <p className="text-sm font-semibold text-slate-700">{card.card_number} · {card.product_name}</p>
        <TextField name="payment_code" autoComplete="off" label={t("agentCards.code")} value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" pending={pending} disabled={!code.trim()} reason={t("agentCards.codeNeeded")}>
            {t("agentCards.issue")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AgentCards() {
  const { loadAgentCards } = useAgentActions();
  const { t } = useTranslation();
  const [cards, setCards] = useState(null);
  const [problem, setProblem] = useState("");
  const [issuing, setIssuing] = useState(null);
  const list = useListControls(cards, { pageSize: 20 });
  const load = useCallback(() => {
    loadAgentCards()
      .then((rows) => {
        setProblem("");
        setCards(rows);
      })
      .catch((error) => {
        setCards([]);
        setProblem(error.message);
      });
  }, [loadAgentCards]);
  useEffect(load, [load]);
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{t("agentCards.title")}</h2>
      {problem && <ErrorState message={problem} onRetry={load} />}
      {cards === null ? (
        <LoadingState />
      ) : !cards.length ? (
        <div className="panel shadow-sm">
          <EmptyState icon={CreditCard} title={t("agentCards.empty")} />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 panel shadow-sm">
          {list.visible.map((card) => (
            <li key={card.inventory_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-slate-800">{card.card_number}</p>
                <p className="text-xs text-slate-500">{[card.product_name, card.product_code, card.assigned_at ? formatDate(card.assigned_at) : null].filter(Boolean).join(" · ")}</p>
              </div>
              <Button size="sm" onClick={() => setIssuing(card)} className="px-3 py-2">
                {t("agentCards.issue")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ShowMore list={list} className="mt-4" />
      {issuing && (
        <IssueDialog
          card={issuing}
          onClose={() => setIssuing(null)}
          onIssued={() => {
            setIssuing(null);
            load();
          }}
        />
      )}
    </section>
  );
}
