import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Send, UserPlus, Users } from "lucide-react";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import { loadAgents } from "@/Services/Agent/agent.api";
import { formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// A super agent's agents (agent/agents) with their agent-wallet balance, lowest
// first so whoever needs float stands out; "Send float" opens Cash In / Out on
// the float tab with the agent's number filled in.
export default function MyAgents() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState(null);
  const [problem, setProblem] = useState("");

  const load = () => {
    loadAgents()
      .then((list) => {
        setProblem("");
        return list;
      })
      .then((list) =>
        setAgents(
          [...list].sort(
            (a, b) =>
              Number(a.float_balance ?? 0) - Number(b.float_balance ?? 0),
          ),
        ),
      )
      .catch((error) => {
        setAgents([]);
        setProblem(error.message);
      });
  };
  useEffect(load, []);

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {t("myAgents.title", { defaultValue: "My agents" })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("myAgents.subtitle", {
              defaultValue: "Your agents and the float in their agent wallets.",
            })}
          </p>
        </div>
        <Link
          to="/signups/new?who=agent"
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90 dark:bg-lime dark:text-on-secondary"
        >
          <UserPlus size={16} />{" "}
          {t("signups.newAgent", { defaultValue: "Sign up an agent" })}
        </Link>
      </div>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} onRetry={load} />
        </div>
      )}
      {agents === null ? (
        <LoadingState />
      ) : agents.length === 0 && !problem ? (
        <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
          <EmptyState
            icon={Users}
            title={t("myAgents.empty", { defaultValue: "No agents yet" })}
            description={t("myAgents.emptyHint", {
              defaultValue:
                "Agents you sign up appear here once the bank approves them.",
            })}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const empty = Number(agent.float_balance ?? 0) <= 0;
            const active = agent.status === 1 || agent.status === "ACTIVE";
            return (
              <li
                key={agent.entity_id ?? agent.phone_number}
                className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {agent.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {agent.phone_number}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700",
                    )}
                  >
                    {active
                      ? t("myAgents.active", { defaultValue: "Active" })
                      : t("myAgents.inactive", { defaultValue: "Inactive" })}
                  </span>
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {t("wallet.purpose.AGENT_FLOAT", {
                    defaultValue: "Agent wallet",
                  })}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xl font-black tracking-tight",
                    empty ? "text-amber-600" : "text-slate-800",
                  )}
                >
                  {formatMoney(agent.float_balance ?? 0, agent.currency_code)}
                </p>
                {agent.float_acct_num && (
                  <p className="break-all text-xs text-slate-400">
                    {agent.float_acct_num}
                  </p>
                )}
                <Link
                  to={`/agent?tab=float&to=${encodeURIComponent(agent.phone_number ?? "")}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50"
                >
                  <Send size={15} />{" "}
                  {t("agent.sendFloat", { defaultValue: "Send float" })}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
