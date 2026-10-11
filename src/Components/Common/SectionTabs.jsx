import { cn } from "@/Utils/Lib/utils";

// The parts of a page (stores, their users, their wallets), as a tab bar
// across the top of the content: left-aligned and underlined, so where you
// are is plain to see. `items` [{ key, label, count? }].
export default function SectionTabs({ items, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        "mb-6 flex gap-1 overflow-x-auto border-b border-slate-200",
        className,
      )}
    >
      {items.map((item) => {
        const on = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative shrink-0 rounded-t-xl px-4 py-3 text-sm font-bold transition duration-200",
              on
                ? "text-slate-800"
                : "text-slate-500 hover:bg-ink/5 hover:text-ink",
            )}
          >
            {item.label}
            {item.count != null && (
              <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-slate-500">
                {item.count}
              </span>
            )}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 origin-center rounded-full bg-forest transition-transform duration-200 dark:bg-lime",
                on ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
