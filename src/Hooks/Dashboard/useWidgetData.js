import { useCallback, useEffect, useState } from "react";
import { loadCards } from "@/Services/Cards/cards.api";
import { listNotifications } from "@/Services/Inbox/inbox.api";
import { listStatements } from "@/Services/Statements/statements.api";

// A small widget's own data: `load` once, again when `refresh` events say so.
function useWidgetData(load) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const run = useCallback(() => {
    load()
      .then((data) => setState({ data, loading: false, error: "" }))
      .catch((error) =>
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error.message,
        })),
      );
  }, [load]);
  useEffect(() => run(), [run]);
  return { ...state, run };
}

const loadCardList = async () => (await loadCards()).cards ?? [];
export const useCardsWidgetData = () => useWidgetData(loadCardList);

const loadLatestNotifications = () => listNotifications({ limit: 4 });
export const useNotificationsWidgetData = () => useWidgetData(loadLatestNotifications);

const loadLatestStatements = () => listStatements({ limit: 3 });
export const useStatementsWidgetData = () => useWidgetData(loadLatestStatements);
