import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";

// A store's opening hours. The API keeps them as rules,
// [{ days: [1..7], opens: "HH:MM", closes: "HH:MM" }] with day 1 Monday; the
// form edits them as one row per day (closed, or opens / closes).
const DAYS = [1, 2, 3, 4, 5, 6, 7];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayName = (n, locale, style = "short") => new Date(Date.UTC(2024, 0, n)).toLocaleDateString(locale, { timeZone: "UTC", weekday: style });

// Rules -> { 1: { open, opens, closes }, ... 7 }.
export function rulesToWeek(rules) {
  const week = Object.fromEntries(DAYS.map((d) => [d, { open: false, opens: "08:00", closes: "17:00" }]));
  (Array.isArray(rules) ? rules : []).forEach((rule) => (rule.days ?? []).forEach((d) => week[d] && (week[d] = { open: true, opens: rule.opens, closes: rule.closes })));
  return week;
}

// The week -> rules, days with the same times grouped into one rule.
export function weekToRules(week) {
  const rules = [];
  DAYS.forEach((d) => {
    const day = week[d];
    if (!day?.open) return;
    const same = rules.find((r) => r.opens === day.opens && r.closes === day.closes);
    if (same) same.days.push(d);
    else rules.push({ days: [d], opens: day.opens, closes: day.closes });
  });
  return rules;
}

export const weekValid = (week) => DAYS.every((d) => !week[d]?.open || (TIME.test(week[d].opens) && TIME.test(week[d].closes) && week[d].opens !== week[d].closes));

// "Mon–Fri 08:00–18:00 · Sat 09:00–13:00", or null when no hours are given.
// `nextDay` (e.g. "(next day)") follows a window that runs past midnight.
export function hoursText(rules, locale, nextDay) {
  if (!Array.isArray(rules) || !rules.length) return null;
  const runs = (days) => {
    const out = [];
    [...new Set(days.map(Number))].sort((a, b) => a - b).forEach((d) => (out.length && out.at(-1)[1] === d - 1 ? (out.at(-1)[1] = d) : out.push([d, d])));
    return out.map(([a, b]) => (a === b ? dayName(a, locale) : `${dayName(a, locale)}–${dayName(b, locale)}`)).join(", ");
  };
  return rules.map((r) => `${runs(r.days ?? [])} ${r.opens}–${r.closes}${nextDay && r.closes < r.opens ? ` ${nextDay}` : ""}`).join(" · ");
}

// `label`: the heading (a store's opening hours unless given).
export default function StoreHoursEditor({ week, onChange, label }) {
  const { t, i18n } = useTranslation();
  const setDay = (d, patch) => onChange({ ...week, [d]: { ...week[d], ...patch } });
  // Monday's hours on every weekday, the usual starting point.
  const copyMonday = () => onChange({ ...week, ...Object.fromEntries([2, 3, 4, 5].map((d) => [d, { ...week[1] }])) });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{label ?? t("stores.hours", { defaultValue: "Opening hours (optional)" })}</p>
        <button type="button" onClick={copyMonday} disabled={!week[1].open} className="text-xs font-semibold text-ink hover:underline disabled:opacity-40">
          {t("stores.hoursCopyMonday", { defaultValue: "Use Monday's hours Tue–Fri" })}
        </button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {DAYS.map((d) => {
          const day = week[d];
          const overnight = day.open && TIME.test(day.opens) && TIME.test(day.closes) && day.closes < day.opens;
          return (
            <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
              <label className="flex w-36 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={day.open} onChange={(e) => setDay(d, { open: e.target.checked })} />
                <span className="font-semibold text-slate-700">{dayName(d, i18n.language, "long")}</span>
              </label>
              {day.open ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="time" aria-label={t("stores.opens", { defaultValue: "Opens" })} className="field-control w-28 py-1.5" value={day.opens} onChange={(e) => setDay(d, { opens: e.target.value })} />
                  <span className="text-slate-400">–</span>
                  <input type="time" aria-label={t("stores.closes", { defaultValue: "Closes" })} className={cn("field-control w-28 py-1.5", day.opens === day.closes && "border-red-400")} value={day.closes} onChange={(e) => setDay(d, { closes: e.target.value })} />
                  {overnight && <span className="text-xs text-slate-500">{t("stores.pastMidnight", { defaultValue: "past midnight" })}</span>}
                </span>
              ) : (
                <span className="text-sm text-slate-400">{t("stores.dayClosed", { defaultValue: "Closed" })}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
