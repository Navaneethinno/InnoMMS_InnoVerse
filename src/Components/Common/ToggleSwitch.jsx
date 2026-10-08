import { cn } from "@/Utils/Lib/utils";

// An on/off switch with its label: a 36x20 track and a 16px knob (on = the
// brand's dark track with the accent knob). It is a button with role="switch",
// so it works with the keyboard and screen readers like a checkbox.
export default function ToggleSwitch({ checked, onChange, label, disabled = false, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("notif-focus inline-flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold text-ink disabled:opacity-50", className)}
    >
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-forest dark:bg-lime" : "bg-slate-300 dark:bg-slate-600")} aria-hidden="true">
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full transition-all", checked ? "left-[18px] bg-lime dark:bg-forest" : "left-0.5 bg-white")} />
      </span>
      {label}
    </button>
  );
}
