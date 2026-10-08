import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";

// Page/section loader. Drawn in the theme's primary colour so it follows the
// bank's branding (the old Lottie file had its colours baked in). Motion is
// switched off by the global prefers-reduced-motion rule in styles.css.
export function LoadingAnimation({ className }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("common.loading")}
      className={cn("flex w-full max-w-[220px] justify-center py-6", className)}
    >
      <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-forest/15 border-t-forest dark:border-lime/15 dark:border-t-lime" />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
