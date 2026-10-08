import { cn } from "@/Utils/Lib/utils";
export default function CheckboxPill({ label, className, ...props }) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5 rounded-lg text-sm text-slate-600",
        className,
      )}
    >
      <input
        {...props}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 accent-forest"
      />
      <span>{label}</span>
    </label>
  );
}
