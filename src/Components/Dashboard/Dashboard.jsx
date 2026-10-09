import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { isStaff } from "@/Utils/Lib/roles";
import { navScreens } from "@/Utils/Config/routeConfig";
import { useTranslation } from "react-i18next";
import { Check, LayoutGrid, RotateCcw } from "lucide-react";
import { DashboardGrid } from "./layout/DashboardGrid";
import { useDashboardLayout } from "./layout/useDashboardLayout";
import { isHidden, useDashboardServer } from "./layout/dashboardData";
import { AccountDataContext, useAccountDataLoader } from "./layout/accountData";
import { WIDGET_REGISTRY } from "./layout/widgetRegistry";

// A customizable widget dashboard (same model as the admin portal's Control
// Space): drag cards to reorder, widen or narrow them, and the layout is
// remembered per user. Widgets read the merchant's wallets and history (layout/accountData).
//
//   Dashboard                 header + "Customize layout" / "Done"
//   layout/widgetRegistry     id -> component, default / min / max span
//   layout/useDashboardLayout saved order + widths (kept by the server)
//   layout/DashboardGrid      dnd-kit context + sortable 4-column grid
//   layout/SortableWidget     one slot: drag handle, width toggle
//   widgets/*                 the widgets themselves
const greetingKey = (hour = new Date().getHours()) => (hour < 12 ? "dash.goodMorning" : hour < 17 ? "dash.goodAfternoon" : "dash.goodEvening");

// Store users have no dashboard (the menu says `dashboard: false`): they go to
// their first screen, and the layout is never asked for.
export default function Dashboard() {
  const user = useSelector((state) => state.auth.user);
  if (user?.dashboard === false || isStaff(user)) {
    const first = (user?.menu ?? []).map((item) => navScreens[item.key]?.to).find((to) => to && to !== "/dashboard");
    return first ? <Navigate to={first} replace /> : null;
  }
  return <MerchantDashboard user={user} />;
}

function MerchantDashboard({ user }) {
  const { t } = useTranslation();
  const server = useDashboardServer();
  const accountData = useAccountDataLoader();
  const serverLayout = useMemo(() => (server.loaded ? { layout: server.layout } : undefined), [server]);
  const { layout, setLayout, resetLayout } = useDashboardLayout(user, serverLayout);
  const visibleIds = useMemo(() => new Set(Object.keys(WIDGET_REGISTRY).filter((id) => !isHidden(server.widgets, id))), [server.widgets]);
  const [editing, setEditing] = useState(false);

  // Esc leaves customize mode (dnd-kit marks its own Esc as handled).
  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-ink">{t("dash.overview")}</p>
          <h1 className="text-2xl font-black leading-none tracking-tight text-slate-800">
            {t(greetingKey(), { name: user?.name ?? user?.username ?? "" })}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">{editing ? t("dash.customizeHint") : t("dash.summary")}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing && layout && (
            <button
              type="button"
              onClick={resetLayout}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:text-ink"
            >
              <RotateCcw size={13} /> {t("dash.resetLayout")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={
              editing
                ? "hidden md:flex items-center gap-1.5 rounded-xl brand-gradient px-4 py-2 text-xs font-bold text-lime shadow-md transition hover:opacity-90"
                : "hidden md:flex items-center gap-1.5 rounded-xl border border-ink/25 bg-surface px-4 py-2 text-xs font-bold text-ink transition hover:bg-ink/5"
            }
          >
            {editing ? <Check size={14} /> : <LayoutGrid size={14} />}
            {editing ? t("dash.done") : t("dash.customizeLayout")}
          </button>
        </div>
      </div>
      {layout ? (
        <AccountDataContext.Provider value={accountData}>
          <DashboardGrid layout={layout} visibleIds={visibleIds} setLayout={setLayout} editing={editing} />
        </AccountDataContext.Provider>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      )}
    </div>
  );
}
