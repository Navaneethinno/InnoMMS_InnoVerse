import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { UserPlus, Users } from "lucide-react";
import Button from "@/Components/Common/Button";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import SegmentedTabs from "@/Components/Common/SegmentedTabs";
import { loadSignups } from "@/Services/Agent/agent.api";
import { formatDateTime } from "@/Utils/Lib/format";
import { isSuperAgent } from "@/Utils/Lib/roles";
import { cn } from "@/Utils/Lib/utils";

// The sign-ups this agent started (agent/signups), newest first, with a filter
// by status, and buttons to start one: a customer (any agent) or an agent (a
// super agent). An unfinished one (ACTIVE) can be continued.
const PAGE = 20;
const STATUS = {
  ACTIVE: [
    "signups.status.ACTIVE",
    "In progress",
    "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ],
  PENDING_REVIEW: [
    "signups.status.PENDING_REVIEW",
    "With the bank",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ],
  COMPLETED: [
    "signups.status.COMPLETED",
    "Approved",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  ],
  REJECTED: [
    "signups.status.REJECTED",
    "Rejected",
    "bg-red-500/15 text-red-700 dark:text-red-300",
  ],
  DISCARDED: [
    "signups.status.DISCARDED",
    "Abandoned",
    "bg-slate-500/15 text-slate-600",
  ],
};
const FILTERS = ["", "ACTIVE", "PENDING_REVIEW", "COMPLETED", "REJECTED"];

export default function Signups() {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  const superAgent = isSuperAgent(user);
  const [status, setStatus] = useState("");
  const [state, setState] = useState({
    items: [],
    total: 0,
    page: 0,
    loading: true,
    problem: "",
  });

  const loadPage = useCallback(
    async (page) => {
      setState((previous) => ({ ...previous, loading: true, problem: "" }));
      try {
        const result = await loadSignups({
          status: status || undefined,
          page,
          limit: PAGE,
        });
        setState((previous) => ({
          items:
            page === 1 ? result.items : [...previous.items, ...result.items],
          total: result.total,
          page,
          loading: false,
          problem: "",
        }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          loading: false,
          problem: error.message,
        }));
      }
    },
    [status],
  );
  useEffect(() => void loadPage(1), [loadPage]);

  const statusText = (code) =>
    STATUS[code] ? t(STATUS[code][0], { defaultValue: STATUS[code][1] }) : code;
  const more = state.items.length < state.total;
  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {t("signups.title", { defaultValue: "Sign-ups" })}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("signups.subtitle", {
              defaultValue:
                "People you are signing up for e-money, and where each one stands.",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/signups/new?who=customer"
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90 dark:bg-lime dark:text-on-secondary"
          >
            <UserPlus size={16} />{" "}
            {t("signups.newCustomer", { defaultValue: "Sign up a customer" })}
          </Link>
          {superAgent && (
            <Link
              to="/signups/new?who=agent"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50"
            >
              <Users size={16} />{" "}
              {t("signups.newAgent", { defaultValue: "Sign up an agent" })}
            </Link>
          )}
        </div>
      </div>
      <SegmentedTabs
        className="mb-4 flex-wrap"
        items={FILTERS.map((code) => ({
          key: code || "all",
          label: code
            ? statusText(code)
            : t("signups.all", { defaultValue: "All" }),
        }))}
        value={status || "all"}
        onChange={(key) => setStatus(key === "all" ? "" : key)}
      />
      {state.problem && (
        <div className="mb-4">
          <ErrorState
            message={state.problem}
            onRetry={() => void loadPage(1)}
          />
        </div>
      )}
      {state.loading && state.page === 0 ? (
        <LoadingState />
      ) : state.items.length === 0 && !state.problem ? (
        <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
          <EmptyState
            icon={UserPlus}
            title={t("signups.empty", { defaultValue: "No sign-ups yet" })}
            description={t("signups.emptyHint", {
              defaultValue:
                "Sign-ups you start appear here, with the bank's decision.",
            })}
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-surface shadow-sm">
          {state.items.map((item) => {
            const tone = STATUS[item.status]?.[2] ?? "bg-ink/5 text-ink";
            const who = item.party === "MERCHANT" ? "agent" : "customer";
            return (
              <li
                key={item.reference_id}
                className="flex flex-wrap items-center gap-3 p-4 sm:px-6"
              >
                <span className="min-w-[12rem] flex-1">
                  <span className="block text-sm font-semibold text-slate-800">
                    {item.name ||
                      t("signups.noName", {
                        defaultValue: "Name not given yet",
                      })}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {[
                      item.phone_number,
                      item.party === "MERCHANT"
                        ? t("roles.agent", { defaultValue: "Agent" })
                        : t("roles.customer", { defaultValue: "Customer" }),
                      item.kind?.toLowerCase(),
                      formatDateTime(item.started_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    tone,
                  )}
                >
                  {statusText(item.status)}
                </span>
                {item.status === "ACTIVE" && (
                  <Link
                    to={`/signups/new?who=${who}&kind=${item.kind === "CORPORATE" ? "corporate" : "individual"}&ref=${encodeURIComponent(item.reference_id)}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink hover:bg-slate-50"
                  >
                    {t("signups.continue", { defaultValue: "Continue" })}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {more && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            pending={state.loading}
            onClick={() => void loadPage(state.page + 1)}
            className="px-6 py-2.5"
          >
            {t("send.loadMore", { defaultValue: "Show more" })}
          </Button>
        </div>
      )}
    </div>
  );
}
