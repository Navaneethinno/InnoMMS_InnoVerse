import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Services/api/environment";

// A thin strip across the top of every screen while the platform runs as UAT
// (testing). It can't be dismissed; nothing shows in production.
export default function EnvironmentBanner() {
  const { t } = useTranslation();
  if (useEnvironment() !== "UAT") return null;
  return (
    <div
      role="status"
      className="relative z-[70] bg-amber-400 px-4 py-1 text-center text-xs font-bold tracking-wide text-amber-950"
    >
      {t("environment.uat")}
    </div>
  );
}
