import { cn } from "@/Utils/Lib/utils";

// One line of a details list (put inside a <dl>): the label on the left, the
// value on the right. `strong` for the line that matters (a total).
export default function DetailRow({ label, children, strong }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0",
        strong && "text-base",
      )}
    >
      <dt
        className={cn(
          "shrink-0 text-sm",
          strong ? "font-bold text-slate-700" : "text-slate-500",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-end text-sm text-slate-800 [overflow-wrap:anywhere]",
          strong ? "font-black" : "font-semibold",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
