import { createElement } from "react";
import { Check } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The choice a page starts with (cash in or out, send or refund, send or top
// up), as large cards above the form, so it can't be missed: each with an icon,
// its name and one line on what it does. The chosen one is marked.
//   items: [{ key, label, description, icon }]   value: key   onChange(key)
export default function ModeSwitch({
  items,
  value,
  onChange,
  label,
  className,
}) {
  return (
    <div
      role="radiogroup"
      data-tour="mode-switch"
      aria-label={label}
      className={cn(
        "mb-6 grid max-w-6xl gap-3",
        items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item) => {
        const on = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="radio"
            data-tour="mode-option"
            data-tour-title={item.label}
            data-tour-description={item.description}
            data-tour-mode={item.key}
            aria-checked={on}
            onClick={() => onChange(item.key)}
            className={cn(
              "group relative flex items-start gap-3.5 rounded-2xl border bg-surface p-4 text-start shadow-sm transition duration-200 active:scale-[0.99] sm:p-5",
              on
                ? "border-forest ring-2 ring-forest/20 dark:border-lime dark:ring-lime/25"
                : "border-slate-200 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-200",
                on
                  ? "brand-gradient dark:bg-none dark:bg-lime/15 dark:ring-1 dark:ring-lime/30 text-lime shadow-md"
                  : "bg-ink/5 text-slate-500 group-hover:text-ink",
              )}
            >
              {item.icon && createElement(item.icon, { size: 20 })}
            </span>
            <span className="min-w-0 flex-1 pe-6">
              <span
                className={cn(
                  "block text-base font-black tracking-tight",
                  on ? "text-slate-800" : "text-slate-600",
                )}
              >
                {item.label}
              </span>
              {item.description && (
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  {item.description}
                </span>
              )}
            </span>
            <span
              className={cn(
                "absolute end-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 transition duration-200",
                on
                  ? "scale-100 border-forest bg-forest text-white dark:border-lime dark:bg-lime dark:text-on-secondary"
                  : "scale-90 border-slate-300",
              )}
            >
              {on && <Check size={12} strokeWidth={3.5} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
