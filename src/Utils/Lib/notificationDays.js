import { getDisplayTimeZone } from "./format";

// Splits a newest-first list into "today", "yesterday" and "earlier" (in the
// institution's time zone, else the browser's), keeping the order:
// [{ key, items }], empty groups left out.
const dayKey = (date, timeZone) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export function groupByDay(items, read = (item) => item.created_at, now = new Date()) {
  const timeZone = getDisplayTimeZone();
  const today = dayKey(now, timeZone);
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);
  const groups = { today: [], yesterday: [], earlier: [] };
  for (const item of items) {
    const date = new Date(read(item));
    const key = Number.isNaN(date.getTime()) ? "earlier" : ((day) => (day === today ? "today" : day === yesterday ? "yesterday" : "earlier"))(dayKey(date, timeZone));
    groups[key].push(item);
  }
  return ["today", "yesterday", "earlier"].filter((key) => groups[key].length).map((key) => ({ key, items: groups[key] }));
}
