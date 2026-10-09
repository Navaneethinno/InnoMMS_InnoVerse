import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import CheckboxPill from "./CheckboxPill";
import { useListControls } from "@/Hooks/Common/useListControls";
import { cn } from "@/Utils/Lib/utils";

// Ticks from a list that may grow long (stores, users): a search once there are
// more than a few, a scrolling box, and how many are ticked.
//   options: [{ value, label }]   value: [ticked values]   onChange(nextValues)
export default function CheckList({ options, value, onChange, layout = "wrap", searchMin = 8, empty }) {
  const { t } = useTranslation();
  const list = useListControls(options, { textOf: (o) => [o.label], pageSize: 10000 });
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  if (!options.length) return empty ?? null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-paper/40 p-3">
      {options.length >= searchMin && (
        <div className="mb-3 flex items-center gap-2">
          <label className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={list.query}
              onChange={(event) => list.setQuery(event.target.value)}
              placeholder={t("list.search", { defaultValue: "Search" })}
              aria-label={t("list.search", { defaultValue: "Search" })}
              className="w-full rounded-lg border border-slate-200 bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-ink/40"
            />
          </label>
          <span className="shrink-0 text-xs font-semibold text-slate-500">
            {t("list.ticked", { count: value.length, defaultValue: "{{count}} ticked" })}
          </span>
        </div>
      )}
      <div className={cn("max-h-56 overflow-y-auto pr-1", layout === "wrap" ? "flex flex-wrap gap-x-5 gap-y-2" : "flex flex-col gap-2")}>
        {list.filtered.map((option) => (
          <CheckboxPill key={option.value} label={option.label} checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
        ))}
        {list.query && !list.matches && <p className="text-xs text-slate-500">{t("list.noMatches", { query: list.query, defaultValue: "Nothing matches “{{query}}”." })}</p>}
      </div>
    </div>
  );
}
