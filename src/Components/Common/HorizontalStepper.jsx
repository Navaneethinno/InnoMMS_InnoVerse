import { Check } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Generic horizontal step indicator, reused by any multi-step flow (e.g. the
// merchant onboarding wizard). Purely presentational — steps, completion and
// navigation are all driven by the caller.
export default function HorizontalStepper({
  steps,
  activeIndex,
  onStepClick,
  isStepCompleted,
  className,
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const done = isStepCompleted?.(step, index) ?? false;
        return (
          <li key={step.id ?? index}>
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "border-ink bg-forest text-white"
                  : done
                    ? "border-lime/60 bg-lime/20 text-on-secondary"
                    : "border-slate-200 bg-surface text-slate-500 hover:border-ink/40",
              )}
            >
              {done && !active ? (
                <Check size={12} className="shrink-0" />
              ) : (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    active ? "bg-white/20" : "bg-slate-100",
                  )}
                >
                  {index + 1}
                </span>
              )}
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
