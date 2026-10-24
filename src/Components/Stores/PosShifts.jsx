import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Pencil } from "lucide-react";
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
import StoreHoursEditor, { hoursText, rulesToWeek, weekToRules, weekValid } from "./StoreHours";
import { ActiveToggle, Pill, StatusPill } from "./posShared";

// Shifts (owner): when a store user may sign in and work on a terminal, as
// windows like a store's opening hours. A user outside their shift is signed
// out on their next action.
export function ShiftDialog({ shift, onClose, onSaved }) {
  const { t } = useTranslation();
  const editing = Boolean(shift?.id);
  const [name, setName] = useState(shift?.name ?? "");
  // A new shift starts on weekdays, 08:00–17:00.
  const [week, setWeek] = useState(() => (shift ? rulesToWeek(shift.windows) : Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { open: d <= 5, opens: "08:00", closes: "17:00" }]))));
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const windows = weekToRules(week);
  const bad = !weekValid(week) || !windows.length;
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
          <StoreHoursEditor week={week} onChange={setWeek} label={t("pos.shiftHours", { defaultValue: "Working hours" })} />
          {bad && <p className="mt-2 text-xs text-red-600">{t("pos.shiftHoursBad", { defaultValue: "Choose at least one day; each needs a start and an end time, and they can't be the same." })}</p>}
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
