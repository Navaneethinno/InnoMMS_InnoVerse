import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

// Plain fallback empty-state (no asset dependency): a muted lucide icon
// centered in the caller's box. Same prop signature as before.
export function NoDataAnimation({ className = "h-24 w-32" }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-center ${className}`} aria-label={t("common:noData")}>
      <Inbox className="h-10 w-10 text-muted-foreground/60" strokeWidth={1.5} />
    </div>
  );
}
