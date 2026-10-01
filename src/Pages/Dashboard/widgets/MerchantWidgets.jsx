import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Clock, FileText, Globe, Shield, Smartphone, Store, TrendingUp, UserCog, UserPlus } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { cn } from "@/Utils/Lib/utils";
import { useWidgetData } from "../layout/dashboardData";
import { WidgetBody, WidgetCard, glass } from "./WidgetCard";

// The merchant portal's widgets, all fed by the one dashboard summary call.
// Chart colours come from the theme's --chart-* tokens.
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

function StatCard({ label, value, sub, gradient, icon: Icon, loading }) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-2 overflow-hidden rounded-2xl border p-5" style={glass}>
      <p className="pr-10 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <span className={cn("absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md", gradient)}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <div>
        {loading ? (
          <span className="block h-9 w-20 animate-pulse rounded-lg bg-muted" />
        ) : (
          <p className="text-4xl font-black leading-none tracking-tight text-slate-800">{value == null ? "—" : Number(value).toLocaleString()}</p>
        )}
        {sub && <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function PendingRequestsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading } = useWidgetData("pendingRequests");
  return <StatCard label={t("pendingRequests")} sub={t("awaitingAuthorization")} value={data?.value} loading={loading} gradient="bg-[var(--pending)]" icon={Clock} />;
}

export function MyRequestsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading } = useWidgetData("myRequests");
  return <StatCard label={t("myRequests")} sub={t("requestsYouSubmitted")} value={data?.value} loading={loading} gradient="bg-[var(--warning)]" icon={FileText} />;
}

// Merchants only: the summary counts customers and merchants together and
// splits them in by_party.
export function ActiveMerchantsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading } = useWidgetData("activeCustomers");
  return <StatCard label={t("activeMerchants")} sub={t("approvedAndActive")} value={data ? (data.by_party?.merchant ?? 0) : null} loading={loading} gradient="bg-[var(--success)]" icon={Store} />;
}

export function OnboardingInProgressWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading } = useWidgetData("onboardingInProgress");
  const sub = data ? t("openAndPending", { open: data.open_sessions ?? 0, pending: data.pending_approval ?? 0 }) : t("draftsAndPendingApproval");
  return <StatCard label={t("onboardingInProgress")} sub={sub} value={data?.value} loading={loading} gradient="bg-[var(--chart-3)]" icon={UserPlus} />;
}

// "2026-09" -> "Sep" (in the UI language).
const monthLabel = (month, lang) => {
  const [y, m] = String(month).split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString(lang, { month: "short" });
};

export function OnboardingTrendWidget() {
  const { t, i18n } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("onboardingTrend");
  const rows = (data?.months ?? []).map((m) => ({ ...m, label: monthLabel(m.month, i18n.language) }));
  return (
    <WidgetCard title={t("onboardingTrend")} icon={TrendingUp} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!rows.length}>
        <div className="min-h-24 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="mmsIndividual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mmsCorporate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="individual" name={t("individual")} stroke="var(--chart-1)" strokeWidth={2} fill="url(#mmsIndividual)" />
              <Area type="monotone" dataKey="corporate" name={t("corporate")} stroke="var(--chart-2)" strokeWidth={2} fill="url(#mmsCorporate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-4 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />{t("individual")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />{t("corporate")}</span>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

export function KycLevelsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("kycLevels");
  const rows = (data?.items ?? []).map((l) => ({ level: `L${l.level_no}`, count: l.count ?? 0 }));
  return (
    <WidgetCard title={t("kycLevels")} icon={BarChart3} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!rows.length} emptyText={t("noKycLevels")}>
        <div className="min-h-24 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="level" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--primary-light)" }} />
              <Bar dataKey="count" name={t("total")} fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

export function RequestBreakdownWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("requestBreakdown");
  const items = data?.items ?? [];
  const max = Math.max(...items.map((r) => r.count ?? 0), 1);
  return (
    <WidgetCard title={t("requestBreakdown")} icon={Shield} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length} emptyText={t("nothingWaiting")}>
        <div className="grid gap-3">
          {items.map((r) => (
            <div key={r.group}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{r.name ?? r.group}</span>
                <span className="font-bold text-slate-700">{r.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--primary-light)]">
                <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${((r.count ?? 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

const SOURCE_ICON = { ADMIN: UserCog, PORTAL_WEB: Globe, PORTAL_APP: Smartphone, PORTAL: Globe };
const SOURCE_KEYS = { ADMIN: "sourceStaff", PORTAL_WEB: "sourceWeb", PORTAL_APP: "sourceApp", PORTAL: "sourcePortal" };

// Merchants only, newest first as the summary sends them.
export function RecentMerchantsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("recentOnboarding");
  const items = (data?.items ?? []).filter((row) => row.party === "MERCHANT");
  return (
    <WidgetCard title={t("recentMerchants")} icon={Activity}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-1 pb-2">{t("merchant")}</th>
                <th className="px-1 pb-2">{t("source")}</th>
                <th className="px-1 pb-2">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const Icon = SOURCE_ICON[row.source] ?? Globe;
                return (
                  <tr key={row.reference_id} className="border-t border-border">
                    <td className="px-1 py-2.5">
                      <div className="font-semibold text-slate-700">{row.name || t("noNameYet")}</div>
                      <div className="text-[10px] text-muted-foreground">{t(row.ownership === "CORPORATE" ? "corporate" : "individual")}</div>
                    </td>
                    <td className="px-1 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-light)] px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Icon size={10} />
                        {SOURCE_KEYS[row.source] ? t(SOURCE_KEYS[row.source]) : row.source}
                      </span>
                    </td>
                    <td className="px-1 py-2.5">
                      <StatusBadge status={row.status_name ?? String(row.status ?? "-")} variant="subtle" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}
