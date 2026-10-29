import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { loadMenu } from "@/Services/Menu/menu.api";
import { loadUnreadCount } from "@/Services/Inbox/inbox.api";
import { countCases } from "@/Services/Cases/cases.api";
import { useNotificationReceived, useCaseChanged } from "@/Hooks/Live/useLiveUpdates";
import { userUpdated } from "@/Redux/slices/authSlice";

// The signed-in shell's menu and its badges, kept in the session (Redux).
export function useMenuAndBadges() {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  // The menu and the features come from the API (labels in the portal's language).
  useEffect(() => {
    loadMenu()
      .then((loaded) => dispatch(userUpdated(loaded)))
      .catch(() => {});
  }, [dispatch, i18n.language]);
  // The inbox's unread count, for the badge; live while the portal is open.
  // Cases waiting for the user: the menu's badge (zeros for a store user).
  const refreshCases = () =>
    countCases()
      .then((count) => dispatch(userUpdated({ casesAction: count.action_needed ?? 0 })))
      .catch(() => {});
  useCaseChanged(refreshCases);
  const refreshUnread = () => {
    loadUnreadCount()
      .then((unread) => dispatch(userUpdated({ unread })))
      .catch(() => {});
    refreshCases();
  };
  useEffect(() => {
    void refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useNotificationReceived(refreshUnread);
}
