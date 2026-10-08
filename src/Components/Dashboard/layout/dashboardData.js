import { useEffect, useState } from "react";
import { dashboardApi } from "@/Services/Dashboard/dashboard.api";
import { notifications } from "@/Utils/Lib/notifications";

// The saved layout and the widgets this merchant may place, from the server
// (`layout` is null until they customise; `widgets` null if it could not say).
export function useDashboardServer() {
  const [state, setState] = useState({ loaded: false, layout: null, widgets: null });
  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .getLayout()
      .then((data) => !cancelled && setState({ loaded: true, layout: data?.layout ?? null, widgets: Array.isArray(data?.widgets) ? data.widgets : null }))
      .catch((error) => {
        if (cancelled) return;
        // Without the server the default layout shows (and is not saved).
        setState({ loaded: true, layout: null, widgets: null });
        notifications.error(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

// The ids the server names widgets by. One of these that it does not list for
// this merchant is hidden; the portal's own widgets (not named here) always show.
const SERVER_WIDGETS = ["balances", "income_spending", "cash_flow", "recent_transactions", "quick_send", "cards", "statements", "notifications"];
export const isHidden = (allowed, id) => Boolean(allowed) && SERVER_WIDGETS.includes(id) && !allowed.includes(id);
