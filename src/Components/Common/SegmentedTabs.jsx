import { cn } from "@/Utils/Lib/utils";

// A small row of tabs on a tinted track: `items` [{ key, label }], `value` the
// key shown, `onChange(key)` on a click.
export default function SegmentedTabs({ items, value, onChange, className }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl bg-ink/5 p-1", className)}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          onClick={() => onChange(item.key)}
          className={cn("rounded-lg px-4 py-1.5 text-xs font-bold transition", value === item.key ? "bg-surface text-ink shadow-sm" : "text-slate-500 hover:text-ink")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
