import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import Spinner from "./Spinner";
import { cn } from "@/Utils/Lib/utils";

// Shared button. `pending` disables it and shows a spinner. `variant`: primary,
// secondary (outlined), ghost (quiet: Back, Cancel, small actions), pill or
// pill-outline (the headers of the pages before sign-in). `size` sm is for
// small actions inside a row. link, dashed, danger and icon are the small actions.
// A disabled button says why on hover: `reason`, else "fill in the details".
// buttonClass gives a link the same look.
//
// `animated` switches on the submit animation used by Sign in (and later
// Verify / Start onboarding): while pending, a darker fill swipes in from
// the left with a light shine across it and the label slides away, then the
// spinner appears until the request settles. `success` turns it green with
// a tick and `successLabel`. When pending ends without success the fill
// retracts and the label comes back. Reduced-motion users get plain swaps
// (the global prefers-reduced-motion rule in styles.css).
const SOLID = "bg-forest text-white hover:bg-forest/90 dark:bg-lime dark:text-on-secondary dark:hover:bg-lime/90";
const PILL = "gap-1.5 whitespace-nowrap rounded-full px-3 py-2 font-bold";
const VARIANTS = {
  primary: SOLID,
  secondary: "border border-slate-200 bg-surface text-ink hover:bg-slate-50",
  ghost: "px-4 py-3 text-slate-500 hover:bg-ink/5 hover:text-ink",
  pill: cn(PILL, SOLID),
  link: "rounded p-0 text-ink hover:underline",
  dashed: "border border-dashed border-ink/50 px-4 py-2 text-ink hover:bg-ink/5",
  danger: "px-4 py-3 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10",
  icon: "rounded-lg p-1.5 text-slate-400 hover:bg-ink/5 hover:text-ink",
  "pill-outline": cn(PILL, "border-[1.5px] border-forest text-forest hover:bg-forest/5 dark:border-lime dark:text-lime dark:hover:bg-lime/10"),
};

const BASE = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed";
export const buttonClass = (variant = "primary", className) => cn(BASE, VARIANTS[variant], className);

export default function Button({
  children,
  pending = false,
  disabled,
  className,
  variant = "primary",
  type = "button",
  size = "md",
  reason,
  animated = false,
  success = false,
  successLabel,
  ...props
}) {
  const busy = pending || success;
  const { t } = useTranslation();
  const base = buttonClass(variant, size === "sm" && "rounded-lg px-2 py-1 text-xs");
  const why = disabled && !busy ? (reason ?? t("common.completeRequired")) : undefined;

  if (!animated) {
    return (
      <button
        type={type}
        disabled={disabled || pending}
        aria-busy={pending}
        title={why}
        className={cn(base, "disabled:opacity-60", className)}
        {...props}
      >
        {pending && <Spinner />}
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={pending}
        title={why}
      className={cn(
        base,
        "relative isolate overflow-hidden disabled:opacity-100",
        success && "!bg-emerald-500 !text-white transition-colors duration-300",
        className,
      )}
      {...props}
    >
      {/* Darker swipe fill + light shine, only while working. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 origin-left bg-black/20 transition-transform duration-[550ms] ease-out",
          busy ? "scale-x-100" : "scale-x-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 -start-1/3 -z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0",
          pending && "button-shine",
        )}
      />

      {/* Idle label: fades and drops away while busy. */}
      <span
        className={cn(
          "inline-flex items-center gap-2 transition-all duration-300",
          busy ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {children}
      </span>

      {/* Spinner: after the fill, until the request settles. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          pending && !success ? "opacity-100 delay-[800ms]" : "opacity-0",
        )}
      >
        <Spinner className="h-5 w-5" />
      </span>

      {/* Success: tick + label with a small overshoot. */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center gap-2 transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          success ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      >
        <Check size={18} strokeWidth={3} />
        {successLabel}
      </span>
    </button>
  );
}
