import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/Components/Common/Button";
import EmptyState from "@/Components/Common/EmptyState";
import ErrorState from "@/Components/Common/ErrorState";
import LoadingState from "@/Components/Common/LoadingState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { ListSearch, NoMatches, ShowMore } from "@/Components/Common/ListControls";
import { useListControls } from "@/Hooks/Common/useListControls";
import { savePosShift, setPosShiftActive } from "@/Services/Pos/pos.api";
import { notifications } from "@/Utils/Lib/notifications";
import { dayName, hoursText } from "./StoreHours";
import { cn } from "@/Utils/Lib/utils";
import { ActiveToggle, Pill, StatusPill } from "./posShared";

// Shifts (owner): when a store user may sign in and work on a terminal, as
// windows [{ days: [1..7], opens, closes }] like a store's opening hours, but
// a day may have several (a split shift: 08:00–12:00 and 14:00–18:00). A
// window that closes before it opens runs past midnight. A user outside their
// shift is signed out on their next action.
const DAYS = [1, 2, 3, 4, 5, 6, 7];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const windowValid = (w) => w.days.length > 0 && TIME.test(w.opens) && TIME.test(w.closes) && w.opens !== w.closes;

function ShiftWindows({ windows, onChange }) {
  const { t, i18n } = useTranslation();
  const set = (i, patch) => onChange(windows.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const toggleDay = (i, d) => set(i, { days: windows[i].days.includes(d) ? windows[i].days.filter((x) => x !== d) : [...windows[i].days, d].sort() });
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{t("pos.shiftHours", { defaultValue: "Working hours" })}</p>
      {windows.map((w, i) => (
        <div key={i} className={cn("space-y-2 rounded-2xl border p-3", windowValid(w) ? "border-slate-200" : "border-red-300")}>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={w.days.includes(d)}
                onClick={() => toggleDay(i, d)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", w.days.includes(d) ? "bg-ink text-white" : "bg-ink/5 text-slate-600 hover:bg-ink/10")}
              >
                {dayName(d, i18n.language)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="time" aria-label={t("stores.opens", { defaultValue: "Opens" })} className="field-control w-28 py-1.5" value={w.opens} onChange={(e) => set(i, { opens: e.target.value })} />
            <span className="text-slate-400">–</span>
            <input type="time" aria-label={t("stores.closes", { defaultValue: "Closes" })} className={cn("field-control w-28 py-1.5", w.opens === w.closes && "border-red-400")} value={w.closes} onChange={(e) => set(i, { closes: e.target.value })} />
            {TIME.test(w.opens) && TIME.test(w.closes) && w.closes < w.opens && <span className="text-xs text-slate-500">{t("pos.nextDay", { defaultValue: "(next day)" })}</span>}
            {windows.length > 1 && (
              <button type="button" aria-label={t("pos.removeWindow", { defaultValue: "Remove this time" })} onClick={() => onChange(windows.filter((_, j) => j !== i))} className="ms-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...windows, { days: [], opens: "14:00", closes: "18:00" }])} className="flex items-center gap-1 text-xs font-semibold text-ink hover:underline">
        <Plus size={13} /> {t("pos.addWindow", { defaultValue: "Add another time (e.g. after a break)" })}
      </button>
    </div>
  );
}

export function ShiftDialog({ shift, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = Boolean(shift?.id);
  const [name, setName] = useState(shift?.name ?? "");
  // A new shift starts on weekdays, 08:00–17:00.
  const [windows, setWindows] = useState(() => (shift?.windows?.length ? shift.windows.map((w) => ({ days: [...(w.days ?? [])], opens: w.opens, closes: w.closes })) : [{ days: [1, 2, 3, 4, 5], opens: "08:00", closes: "17:00" }]));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const bad = !windows.length || !windows.every(windowValid);
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setProblem("");
    try {
      await savePosShift({ ...(editing ? { id: shift.id } : {}), name: name.trim(), windows });
      notifications.success(t("pos.shiftSaved", { defaultValue: "Shift saved. It applies at once." }));
      onSaved();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} pending={pending} size="lg" title={editing ? t("pos.editShift", { defaultValue: "Edit shift" }) : t("pos.addShift", { defaultValue: "Add a shift" })}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <TextField name="name" maxLength={64} label={t("pos.name", { defaultValue: "Name" })} value={name} onChange={(event) => setName(event.target.value)} />
        <div>
          <ShiftWindows windows={windows} onChange={setWindows} />
          {bad && <p className="mt-2 text-xs text-red-600">{t("pos.shiftHoursBad", { defaultValue: "Each time needs at least one day, and a start and an end time that aren't the same." })}</p>}
        </div>
        {editing && <p className="text-xs text-slate-500">{t("pos.shiftChangeHint", { defaultValue: "A change applies at once: a user outside their new shift is signed out on their next action." })}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" pending={pending} disabled={!name.trim() || bad}>
            {t("common.save", { defaultValue: "Save" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PosShifts({ shifts, onEdit, onChanged }) {
  const { t, i18n } = useTranslation();
  const list = useListControls(shifts, { textOf: (s) => [s.name, s.status] });
  if (shifts === null) return <LoadingState />;
  if (!shifts.length)
    return (
      <div className="rounded-3xl border border-slate-200 bg-surface shadow-sm">
        <EmptyState icon={Clock} title={t("pos.noShifts", { defaultValue: "No shifts yet" })} description={t("pos.noShiftsHint", { defaultValue: "A shift limits when a store user may sign in on a terminal. A user without one may sign in any time." })} />
      </div>
    );
  const nextDay = t("pos.nextDay", { defaultValue: "(next day)" });
  return (
    <>
      <ListSearch list={list} placeholder={t("pos.searchShifts", { defaultValue: "Search shifts" })} />
      <NoMatches list={list} />
      <ul className="grid gap-4 md:grid-cols-2">
        {list.visible.map((shift) => (
          <li key={shift.id} className="flex flex-col rounded-3xl border border-slate-200 bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-bold text-slate-800">{shift.name}</p>
              <span className="flex shrink-0 gap-1.5">
                {shift.status === "ACTIVE" && shift.open_now && <Pill tone="bg-sky-500/15 text-sky-700 dark:text-sky-300">{t("pos.openNow", { defaultValue: "Open now" })}</Pill>}
                <StatusPill status={shift.status} />
              </span>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <Clock size={13} className="mt-0.5 shrink-0" />
              {hoursText(shift.windows, i18n.language, nextDay) ?? "—"}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">{t("pos.userCount", { count: shift.user_count ?? 0, defaultValue: "{{count}} users" })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onEdit(shift)} className="px-3 py-2">
                <Pencil size={14} /> {t("stores.editShort", { defaultValue: "Edit" })}
              </Button>
              <ActiveToggle item={shift} onToggle={setPosShiftActive} onDone={onChanged} warning={t("pos.shiftOffWarning", { defaultValue: "Users with this shift can't sign in until you activate it or give them another shift." })} />
            </div>
          </li>
        ))}
      </ul>
      <ShowMore list={list} />
    </>
  );
}
