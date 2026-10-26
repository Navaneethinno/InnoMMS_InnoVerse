import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// Balances are hidden until asked for: an eye next to them shows them for 10
// seconds, then they hide again by themselves (or at once, on the eye again).
// An eye shows only the balances of its own group (a dashboard card, an
// agent's card: <BalanceGroup>); outside any group, the page's balances share
// one eye. Moving to another page doesn't leave them shown.
const SHOW_MS = 10_000;
const PAGE = "page";
const shownUntil = new Map();
const timers = new Map();
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function showBalances(group) {
  window.clearTimeout(timers.get(group));
  shownUntil.set(group, Date.now() + SHOW_MS);
  timers.set(
    group,
    window.setTimeout(() => hideGroup(group), SHOW_MS),
  );
  notify();
}
function hideGroup(group) {
  window.clearTimeout(timers.get(group));
  shownUntil.delete(group);
  notify();
}
export function hideBalances() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.clear();
  shownUntil.clear();
  notify();
}

const GroupContext = createContext(PAGE);
// Balances and the eye inside it show and hide together, apart from the rest.
export function BalanceGroup({ children }) {
  return (
    <GroupContext.Provider value={useId()}>{children}</GroupContext.Provider>
  );
}
export function useBalancesShown() {
  const group = useContext(GroupContext);
  const isShown = useCallback(
    () => (shownUntil.get(group) ?? 0) > Date.now(),
    [group],
  );
  return useSyncExternalStore(subscribe, isShown);
}

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
  const group = useContext(GroupContext);
  const shown = useBalancesShown();
  const label = shown
    ? t("balance.hide", { defaultValue: "Hide balance" })
    : t("balance.show", { defaultValue: "Show balance for 10 seconds" });
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (shown) hideGroup(group);
        else showBalances(group);
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
            key={shownUntil.get(group)}
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
