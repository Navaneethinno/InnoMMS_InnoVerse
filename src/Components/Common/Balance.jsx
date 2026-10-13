import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// Balances are hidden until asked for: an eye next to them shows every balance
// on the screen for 10 seconds, then they hide again by themselves (or at once,
// on the eye again). One switch for the whole portal, so a page with several
// balances needs one tap, and moving to another page doesn't leave them shown.
const SHOW_MS = 10_000;
let shownUntil = 0;
let timer = null;
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const isShown = () => shownUntil > Date.now();
function showBalances() {
  window.clearTimeout(timer);
  shownUntil = Date.now() + SHOW_MS;
  timer = window.setTimeout(hideBalances, SHOW_MS);
  notify();
}
export function hideBalances() {
  window.clearTimeout(timer);
  shownUntil = 0;
  notify();
}
export const useBalancesShown = () => useSyncExternalStore(subscribe, isShown);

// Hidden when the person leaves the page or the tab: never left showing.
export function useHideBalancesOnLeave() {
  useEffect(() => {
    const onHide = () =>
      document.visibilityState === "hidden" && hideBalances();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      hideBalances();
    };
  }, []);
}

// A balance: the amount when shown, else the currency and dots.
export function Balance({ value, currency, signed }) {
  const shown = useBalancesShown();
  if (shown) return formatMoney(value, currency, { signed });
  return balanceText(false, value, currency);
}
// The text of a balance (for a dropdown's description, a title).
export const balanceText = (shown, value, currency) =>
  shown
    ? formatMoney(value, currency)
    : `${currency ? `${currency} ` : ""}••••••`;

// The eye: shows the balances, with a ring running down the 10 seconds.
export function BalanceEye({ size = 16, className }) {
  const { t } = useTranslation();
  const shown = useBalancesShown();
  const label = shown
    ? t("balance.hide", { defaultValue: "Hide balance" })
    : t("balance.show", { defaultValue: "Show balance for 10 seconds" });
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (shown) hideBalances();
        else showBalances();
      }}
      aria-label={label}
      title={label}
      aria-pressed={shown}
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-ink/5 hover:text-ink active:scale-95",
        className,
      )}
    >
      {shown && (
        <svg
          aria-hidden="true"
          viewBox="0 0 32 32"
          className="absolute inset-0 h-full w-full -rotate-90"
        >
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="2"
          />
          <circle
            key={shownUntil}
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            className="balance-countdown"
          />
        </svg>
      )}
      {shown ? <EyeOff size={size} /> : <Eye size={size} />}
    </button>
  );
}
