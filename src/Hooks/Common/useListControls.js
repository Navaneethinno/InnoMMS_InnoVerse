import { useMemo, useState } from "react";

// A list that can grow: a search over the fields `textOf` gives for each item,
// and the first `pageSize` matches with "Show more" for the rest. Searching
// starts again from the first page.
//
//   const list = useListControls(stores, { textOf: (s) => [s.name, s.code] });
//   list.visible.map(...)  list.hasMore && <ShowMore {...list} />
export function useListControls(items, { textOf, pageSize = 12 } = {}) {
  const [query, setQueryState] = useState("");
  const [shown, setShown] = useState(pageSize);
  const all = useMemo(() => items ?? [], [items]);
  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length || !textOf) return all;
    return all.filter((item) => {
      const text = textOf(item).filter((x) => x != null).join(" ").toLowerCase();
      return words.every((word) => text.includes(word));
    });
    // `textOf` is read fresh each time; the list and the query decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, query]);
  const setQuery = (next) => {
    setQueryState(next);
    setShown(pageSize);
  };
  return {
    query,
    setQuery,
    total: all.length,
    matches: filtered.length,
    filtered,
    visible: filtered.slice(0, shown),
    hasMore: filtered.length > shown,
    remaining: Math.max(0, filtered.length - shown),
    showMore: () => setShown((n) => n + pageSize),
  };
}
