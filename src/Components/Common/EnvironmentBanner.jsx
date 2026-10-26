import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Services/api/environment";

// A thin strip across the top of every screen while the platform runs as UAT
// (testing). It can't be dismissed; nothing shows in production. It takes the
// theme's brand colours: the bank's once signed in, the default ones before.
export default function EnvironmentBanner() {
  const { t } = useTranslation();
  if (useEnvironment() !== "UAT") return null;
  return (
    <div
      role="status"
      className="relative z-[70] flex items-center justify-center gap-2 bg-forest px-4 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" />
      {t("environment.uat")}
    </div>
  );
}
