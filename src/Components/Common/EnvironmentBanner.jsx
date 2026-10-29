import { useTranslation } from "react-i18next";
import { useEnvironment } from "@/Hooks/Layout/useEnvironment";

// A diagonal ribbon across the top-right corner of every screen while the
// platform runs as UAT (testing). It can't be dismissed and clicks pass
// through it; nothing shows in production. It takes the theme's brand
// colours: the bank's once signed in, the default ones before.
export default function EnvironmentBanner() {
  const { t } = useTranslation();
  if (useEnvironment() !== "UAT") return null;
  return (
    <div role="status" aria-label={t("environment.uat")} title={t("environment.uat")} className="pointer-events-none fixed right-0 top-0 z-[70] h-12 w-12 overflow-hidden sm:h-16 sm:w-16">
      <div className="absolute right-[-36px] top-[6px] w-[110px] sm:right-[-30px] sm:top-[10px] rotate-45 bg-forest py-0.5 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-md">
        UAT
      </div>
    </div>
  );
}
