import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The portal's date picker, in place of <input type="date">: `value`, `min`
// and `max` are YYYY-MM-DD and onChange gets the new YYYY-MM-DD ("" when
// cleared). The calendar opens in a portal (never clipped by a card or a
// modal), with day, month and year views, so a date of birth decades back
// is three clicks away. Same design as the admin portal's DateInput.

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
};
const todayIso = () => {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
};
const WIDTH = 288;

export default function DatePicker({ value, onChange, min, max, disabled, className, placeholder, id, "aria-invalid": invalid }) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language || "en";
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("days");
  const selected = parse(value);
  // A min/max date pulls the calendar into range (e.g. a date of birth
  // opens at the latest allowed year, not today).
  const start = () => selected ?? parse(max && todayIso() > max ? max : min && todayIso() < min ? min : todayIso());
  const [cursor, setCursor] = useState(start);
  const [pos, setPos] = useState(null);

  const inRange = (day) => (!min || day >= String(min).slice(0, 10)) && (!max || day <= String(max).slice(0, 10));
  const pick = (next) => {
    onChange?.(next);
    setOpen(false);
  };
  const show = () => {
    if (disabled) return;
    setCursor(start());
    setView("days");
    setOpen(true);
  };

  // Below the field, or above it when there is no room; kept on screen.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const height = panelRef.current?.offsetHeight ?? 340;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - WIDTH - 8);
      const below = r.bottom + 6 + height <= window.innerHeight;
      setPos({ left, top: below ? r.bottom + 6 : Math.max(8, r.top - height - 6) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = selected
    ? new Date(Date.UTC(selected.y, selected.m, selected.d)).toLocaleDateString(locale, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    : "";
  const monthName = (m, style = "long") => new Date(Date.UTC(2000, m, 1)).toLocaleDateString(locale, { timeZone: "UTC", month: style });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { timeZone: "UTC", weekday: "narrow" }));

  const { y, m } = cursor;
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // Monday first
  const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const yearStart = y - (y % 12);
  const today = todayIso();
  const step = (delta) => {
    if (view === "days") setCursor(({ y: cy, m: cm }) => ({ y: cm + delta < 0 ? cy - 1 : cm + delta > 11 ? cy + 1 : cy, m: (cm + delta + 12) % 12 }));
    else setCursor((c) => ({ ...c, y: c.y + delta * (view === "years" ? 12 : 1) }));
  };

  const cell = "flex items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30";
  const on = "bg-forest text-white shadow-sm dark:bg-lime dark:text-on-secondary";
  const off = "text-slate-700 hover:bg-ink/10 hover:text-ink dark:text-slate-200";
  const ghost = "rounded-lg hover:bg-ink/10 hover:text-ink";

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={invalid}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn("field-control flex items-center justify-between gap-2 text-start", className, open && "border-ink ring-2 ring-ink/10")}
      >
        <span className={cn("truncate", !label && "text-slate-400")}>{label || placeholder || t("datePicker.select")}</span>
        <CalendarDays size={16} className={cn("shrink-0", open ? "text-ink" : "text-slate-500")} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            className="fixed z-[1000] rounded-2xl border border-slate-200 bg-surface p-3 shadow-xl transition-opacity"
            style={{ width: WIDTH, left: pos?.left ?? -9999, top: pos?.top ?? -9999, opacity: pos ? 1 : 0 }}
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <button type="button" onClick={() => step(-1)} className={cn(ghost, "p-1.5 text-slate-500")} aria-label={t("datePicker.previous")}>
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
                {view === "days" && (
                  <button type="button" onClick={() => setView("months")} className={cn(ghost, "px-2 py-1")}>
                    {monthName(m)}
                  </button>
                )}
                {view !== "years" ? (
                  <button type="button" onClick={() => setView("years")} className={cn(ghost, "px-2 py-1")}>
                    {y}
                  </button>
                ) : (
                  <span className="px-2 py-1">
                    {yearStart} – {yearStart + 11}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => step(1)} className={cn(ghost, "p-1.5 text-slate-500")} aria-label={t("datePicker.next")}>
                <ChevronRight size={16} />
              </button>
            </div>

            {view === "days" && (
              <div className="grid grid-cols-7 gap-0.5">
                {weekdays.map((w, i) => (
                  <span key={i} className="flex h-7 items-center justify-center text-[10px] font-bold uppercase text-slate-400">
                    {w}
                  </span>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <span key={`e${i}`} />;
                  const day = iso(y, m, d);
                  const isSel = value && String(value).slice(0, 10) === day;
                  return (
                    <button key={day} type="button" disabled={!inRange(day)} onClick={() => pick(day)} className={cn(cell, "h-9", isSel ? on : off, !isSel && day === today && "ring-1 ring-inset ring-ink")}>
                      {d}
                    </button>
                  );
                })}
              </div>
            )}

            {view === "months" && (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCursor((c) => ({ ...c, m: i }));
                      setView("days");
                    }}
                    className={cn(cell, "h-11", i === m ? on : off)}
                  >
                    {monthName(i, "short")}
                  </button>
                ))}
              </div>
            )}

            {view === "years" && (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => yearStart + i).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setCursor((c) => ({ ...c, y: yr }));
                      setView("months");
                    }}
                    className={cn(cell, "h-11", yr === y ? on : off)}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <button type="button" onClick={() => pick("")} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">
                <X size={12} /> {t("datePicker.clear")}
              </button>
              <button type="button" disabled={!inRange(today)} onClick={() => pick(today)} className={cn(ghost, "px-2.5 py-1 text-xs font-bold text-ink disabled:opacity-40")}>
                {t("datePicker.today")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
