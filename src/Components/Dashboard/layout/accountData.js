import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loadSummary, loadWallets } from "@/Services/Account/account.api";
import { readAuthUser } from "@/Services/api/authStorage";
import { useWalletChanged } from "@/Services/api/liveUpdates";

// What the dashboard shows, from the customer's own account calls: the Active
// wallets, and the server's summary (this month's income and spending, the
// monthly flow for the chart, and the latest transactions).
export const AccountDataContext = createContext({ wallets: null, summary: null, loading: true, walletsError: "", summaryError: "" });

const MONTHS = 6;

// The last good answer for this customer, kept for a couple of minutes so
// coming back to the dashboard does not ask again. A live "money moved"
// message always refetches.
const FRESH_MS = 2 * 60 * 1000;
let cache = null;
const cached = () => (cache && cache.user === readAuthUser()?.id && Date.now() - cache.at < FRESH_MS ? cache : null);

export function useAccountDataLoader() {
  const [state, setState] = useState(() => {
    const hit = cached();
    return { wallets: hit?.wallets ?? null, summary: hit?.summary ?? null, loading: !hit, walletsError: "", summaryError: "" };
  });
  // The two calls are independent: wallets still show when the summary fails.
  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState((previous) => ({ ...previous, loading: true }));
    const [wallets, summary] = await Promise.allSettled([loadWallets(), loadSummary({ months: MONTHS })]);
    if (wallets.status === "fulfilled" && summary.status === "fulfilled") {
      cache = { user: readAuthUser()?.id, at: Date.now(), wallets: wallets.value, summary: summary.value };
    }
    setState((previous) => ({
      wallets: wallets.status === "fulfilled" ? wallets.value : previous.wallets,
      summary: summary.status === "fulfilled" ? summary.value : previous.summary,
      loading: false,
      walletsError: wallets.status === "rejected" ? wallets.reason.message : "",
      summaryError: summary.status === "rejected" ? summary.reason.message : "",
    }));
  }, []);
  useEffect(() => {
    if (!cached()) void refresh();
  }, [refresh]);
  // Money moved: update quietly, without the loading state.
  useWalletChanged(() => void refresh({ quiet: true }));
  return { ...state, refresh };
}

export const useAccountData = () => useContext(AccountDataContext);

// The summary's entry for a currency (the first one when no currency is asked).
const forCurrency = (summary, currency) => (currency ? summary?.currencies?.find((entry) => entry.currency_code === currency) : summary?.currencies?.[0]) ?? null;

// This month's income and spending in one currency (the API's own text, so a
// very large figure keeps every digit).
export function monthTotals(summary, currency) {
  const month = forCurrency(summary, currency)?.this_month;
  return { income: month?.income ?? "0", spending: month?.spending ?? "0" };
}

// Income and spending per month for the chart, oldest first (every month of the
// window is there, quiet ones as zeros).
export const monthlyFlow = (summary, currency) =>
  (forCurrency(summary, currency)?.monthly ?? []).map((row) => ({ month: row.month, income: Number(row.income), spending: Number(row.spending) }));
