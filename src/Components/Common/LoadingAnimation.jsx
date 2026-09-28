import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// Plain fallback loader (no asset dependency): a spinning lucide icon
// centered in whatever box the caller sizes. Kept the same prop signature
// as before so call sites don't change.
export function LoadingAnimation({ className = "h-16 w-64" }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-center ${className}`} aria-label={t("common:loading")}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={2} />
    </div>
  );
}
