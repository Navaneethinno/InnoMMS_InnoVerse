import i18n from "@/Utils/I18n/i18n";
import { cn } from "@/Utils/Lib/utils";

// The card every dashboard widget sits in.
export function WidgetCard({ title, icon: Icon, action, className, children }) {
  return (
    <div className={cn("relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl brand-gradient text-lime shadow-md">
                <Icon size={14} />
              </span>
            )}
            <h2 className="truncate text-sm font-bold text-slate-800">{title}</h2>
          </div>
          {action}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}

export const money = (value, signed = false) => {
  const text = Math.abs(Number(value)).toLocaleString(i18n.resolvedLanguage, { style: "currency", currency: "USD" });
  return signed ? `${value < 0 ? "-" : "+"}${text}` : text;
};
