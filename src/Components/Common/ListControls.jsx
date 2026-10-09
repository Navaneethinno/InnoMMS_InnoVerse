import { useTranslation } from "react-i18next";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Search over a list, shown once the list is long enough to need it (`min`),
// with how many match.
export function ListSearch({ list, placeholder, min = 6, className }) {
  const { t } = useTranslation();
  if (list.total < min) return null;
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-3", className)}>
      <label className="relative min-w-[14rem] flex-1 sm:max-w-sm">
        <span className="sr-only">{placeholder ?? t("list.search", { defaultValue: "Search" })}</span>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={list.query}
          onChange={(event) => list.setQuery(event.target.value)}
          placeholder={placeholder ?? t("list.search", { defaultValue: "Search" })}
          className="w-full rounded-xl border border-slate-200 bg-surface py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {list.query && (
          <button
            type="button"
            onClick={() => list.setQuery("")}
            aria-label={t("list.clear", { defaultValue: "Clear search" })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-ink/5 hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </label>
      <span className="text-xs font-semibold text-slate-500">
        {list.query
          ? t("list.matches", { count: list.matches, total: list.total, defaultValue: "{{count}} of {{total}}" })
          : t("list.total", { count: list.total, defaultValue: "{{count}} in all" })}
      </span>
    </div>
  );
}

// "Show more", under a list that has more than it shows.
export function ShowMore({ list, className }) {
  const { t } = useTranslation();
  if (!list.hasMore) return null;
  return (
    <div className={cn("mt-4 flex justify-center", className)}>
      <button
        type="button"
        onClick={list.showMore}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-ink/5"
      >
        <ChevronDown size={15} />
        {t("list.showMore", { count: list.remaining, defaultValue: "Show more ({{count}} left)" })}
      </button>
    </div>
  );
}

// Nothing matched the search (the list itself isn't empty).
export function NoMatches({ list, className }) {
  const { t } = useTranslation();
  if (!list.query || list.matches) return null;
  return (
    <p className={cn("rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500", className)}>
      {t("list.noMatches", { query: list.query, defaultValue: "Nothing matches “{{query}}”." })}
    </p>
  );
}
