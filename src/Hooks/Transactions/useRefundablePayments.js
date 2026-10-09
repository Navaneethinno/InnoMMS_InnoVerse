import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadHistory, loadHistoryFilters } from "@/Services/Account/account.api";

const PAGE = 20;
const DEFAULT_PERIOD = "LAST_3_MONTHS";

// The payments customers made to this merchant (MERCHANT_PAYMENT credits), the
// ones a refund can name. A period at a time (the API's own periods, with their
// dates), newest first, PAGE lines per call: `more()` adds the next page.
// `periods` [{ code, label, from, to }] for the period picker (CUSTOM left out).
export function useRefundablePayments({ initialPeriod = DEFAULT_PERIOD } = {}) {
  const { t } = useTranslation();
  const [periods, setPeriods] = useState(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [state, setState] = useState({ items: null, total: 0, page: 0, loading: true, error: "" });

  useEffect(() => {
    loadHistoryFilters()
      .then((filters) => setPeriods((filters.periods ?? []).filter((item) => item.from && item.to)))
      .catch(() => setPeriods([]));
  }, [t]);

  const range = periods?.find((item) => item.code === period);
  const load = useCallback(
    async (page) => {
      setState((previous) => ({ ...previous, loading: true, error: "", ...(page === 1 ? { items: null } : {}) }));
      try {
        const { items, total } = await loadHistory({ page, limit: PAGE, txnType: "MERCHANT_PAYMENT", from: range?.from ?? "", to: range?.to ?? "", refundable: true });
        // The server leaves out fully refunded payments; an older one may not.
        const received = items.filter((item) => item.direction === "CR" && (item.refundable == null || Number(item.refundable) > 0));
        setState((previous) => ({
          items: page === 1 ? received : [...(previous.items ?? []), ...received],
          total,
          page,
          loading: false,
          error: "",
        }));
      } catch (error) {
        setState((previous) => ({ ...previous, items: previous.items ?? [], loading: false, error: error.message }));
      }
    },
    [range?.from, range?.to],
  );

  // Wait for the periods (their dates) before the first call; without them,
  // every payment is asked for.
  const ready = periods !== null;
  useEffect(() => {
    if (ready) void load(1);
  }, [load, ready, t]);

  const shown = state.items?.length ?? 0;
  return {
    ...state,
    periods: periods ?? [],
    period,
    setPeriod,
    // By pages asked, not lines kept: a page can hold lines that are not credits.
    hasMore: !state.loading && shown > 0 && state.page * PAGE < state.total,
    more: () => load(state.page + 1),
    reload: () => load(1),
  };
}
