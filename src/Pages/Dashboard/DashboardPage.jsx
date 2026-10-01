import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, LayoutGrid, RefreshCw, RotateCcw } from "lucide-react";
import { useAuth } from "@/Hooks/useAuth";
import { DashboardGrid } from "./layout/DashboardGrid";
import { useDashboardLayout } from "./layout/useDashboardLayout";
import { DashboardDataContext, isHidden, useDashboardSummary } from "./layout/dashboardData";
import { WIDGET_REGISTRY } from "./layout/widgetRegistry";

// Landing page after login (route "/" and "/dashboard"): a customizable
// widget dashboard, the same grid as the admin panel's Control Space.
//
//   layout/widgetRegistry      id -> component, summary widget, default size
//   layout/gridLayout          saved layout <-> grid items (pure helpers)
//   layout/useDashboardLayout  per-user saved places and sizes (server only)
//   layout/dashboardData       one summary call for every widget
//   layout/DashboardGrid       react-grid-layout: drag, resize, drop preview
//   widgets/                   the widgets themselves
function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const user = useAuth((s) => s.user);
  const summary = useDashboardSummary();
  const { layout, setLayout, resetLayout } = useDashboardLayout(user, summary.layout);
  const visibleIds = useMemo(
    () => new Set(Object.keys(WIDGET_REGISTRY).filter((id) => !isHidden(summary.widgets, WIDGET_REGISTRY[id].dataId))),
    [summary.widgets],
  );
  const [editing, setEditing] = useState(false);

  // Esc leaves customize mode.
  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
            {t("controlSpace")}
          </p>
          <h1 className="text-2xl font-black leading-none tracking-tight text-slate-800">{t(greetingKey(), { name: user?.username ?? t("admin") })}</h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{editing ? t("customizeHint") : t("workspaceSummary")}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              disabled={summary.loading}
              onClick={() => void summary.refresh([...new Set(Object.values(WIDGET_REGISTRY).map((w) => w.dataId))])}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
            >
              <RefreshCw size={13} className={summary.loading ? "animate-spin" : ""} /> {t("refresh")}
            </button>
          )}
          {editing && layout && (
            <button
              type="button"
              onClick={resetLayout}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw size={13} /> {t("resetLayout")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={
              editing
                ? "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-[var(--primary-hover)]"
                : "flex items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--primary-light)]"
            }
            style={editing ? undefined : { color: "var(--primary)", borderColor: "var(--primary-light)" }}
          >
            {editing ? <Check size={14} /> : <LayoutGrid size={14} />}
            {editing ? t("done") : t("customizeLayout")}
          </button>
        </div>
      </div>

      <DashboardDataContext.Provider value={summary}>
        {layout ? (
          <DashboardGrid layout={layout} visibleIds={visibleIds} setLayout={setLayout} editing={editing} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        )}
      </DashboardDataContext.Provider>
    </div>
  );
}
