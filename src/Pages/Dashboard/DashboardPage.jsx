import { useTranslation } from "react-i18next";
import { useAuth } from "@/Hooks/useAuth";

// Landing page after login (route "/" and "/dashboard"). Not a sidebar menu:
// it is never sourced from menu_array. Replace the body with this project's
// own dashboard.
function greetingKey(hour = new Date().getHours()) {
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const user = useAuth((s) => s.user);
  return (
    <div className="pb-8 pt-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
        {t("controlSpace")}
      </p>
      <h1 className="text-2xl font-black tracking-tight text-slate-800">{t(greetingKey(), { name: user?.username ?? t("admin") })}</h1>
      <p className="mt-1.5 text-sm font-medium text-muted-foreground">{t("welcome")}</p>
    </div>
  );
}
