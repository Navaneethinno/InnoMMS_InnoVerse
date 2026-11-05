import { createElement } from "react";
import { cn } from "@/Utils/Lib/utils";

// A short either/or in rounded pills: `items` [{ key, label, icon }], `value`
// the key chosen, `onChange(key)` on a click.
export default function PillChoice({ items, value, onChange, label, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="radio"
          aria-checked={value === item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition",
            value === item.key ? "bg-forest text-white dark:bg-lime dark:text-on-secondary" : "text-ink/70 hover:bg-ink/5",
          )}
        >
          {item.icon && createElement(item.icon, { size: 15 })} {item.label}
        </button>
      ))}
    </div>
  );
}
