import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Footer from "./Footer";
import IdleWarning from "./IdleWarning";
import SessionEndWarning from "./SessionEndWarning";
import { TransactionPinDialog, useNeedsTransactionPin } from "@/Components/Account/TransactionPinSetup";
import { loadMenu } from "@/Services/Menu/menu.api";
import { loadUnreadCount } from "@/Services/Inbox/inbox.api";
import { connectLive, useNotificationReceived } from "@/Services/api/liveUpdates";
import { useDispatch } from "react-redux";
import { userUpdated } from "@/Redux/slices/authSlice";
import { useIdleSignOut } from "@/Hooks/Auth/useIdleSignOut";
import { useMeRefresh } from "@/Hooks/Auth/useMeRefresh";
import { useSessionEnd } from "@/Hooks/Auth/useSessionEnd";
import { useSignOut } from "@/Hooks/Auth/useSignOut";
import { STORAGE_KEYS } from "@/Utils/Constant";

// The signed-in area: a floating sidebar (the menu) on the left, the top bar
// above the page, the page itself, then the footer. On a phone the sidebar is
// a drawer opened from the top bar. The sidebar starts open and pinned at every
// sign-in; collapsing it is remembered on this device until the next sign-in.
// Collapsed, it is an icon rail that opens while the mouse is on it, and the
// page moves over with it (the same as the admin portal).
const COLLAPSE_KEY = STORAGE_KEYS.sidebarCollapsed;
const RAIL_W = 76;
const OPEN_W = 272;
const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [hovering, setHovering] = useState(false);
  const idle = useIdleSignOut();
  const sessionEnd = useSessionEnd();
  const signOut = useSignOut();
  const refreshMe = useMeRefresh();
  const needsTxnPin = useNeedsTransactionPin();
  const [pinDialogClosed, setPinDialogClosed] = useState(false);
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  // The menu and the features come from the API (labels in the portal's language).
  useEffect(() => {
    loadMenu()
      .then(({ menu, features }) => dispatch(userUpdated({ menu, features })))
      .catch(() => {});
  }, [dispatch, i18n.language]);
  // The inbox's unread count, for the badge; live while the portal is open.
  const refreshUnread = () => loadUnreadCount().then((unread) => dispatch(userUpdated({ unread }))).catch(() => {});
  useEffect(() => {
    void refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useNotificationReceived(refreshUnread);
  useEffect(() => {
    const locked = () => dispatch(userUpdated({ pinLocked: true }));
    window.addEventListener("customer:pin-locked", locked);
    return () => window.removeEventListener("customer:pin-locked", locked);
  }, [dispatch]);

  // Who the customer is (auth/me): the PIN rules and status, one PIN or two, the
  // time zone, the avatar. Asked when the area opens and again when the tab is
  // back in view (at most once a minute), so a change made on another device (a
  // new avatar, a PIN set) shows up.
  useEffect(() => {
    let last = Date.now();
    void refreshMe();
    const back = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 60000) return;
      last = Date.now();
      void refreshMe();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [refreshMe]);

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => connectLive(), []);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (event) => event.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const toggle = () =>
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        /* The choice just won't be remembered. */
      }
      return !value;
    });

  return (
    <div className="min-h-screen bg-paper bg-fixed bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.28),rgb(var(--color-secondary)/0.16)_50%,rgb(var(--color-secondary)/0.26))] dark:bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.07),rgb(var(--color-secondary)/0.02)_50%,rgb(var(--color-secondary)/0.06))]">
      <div className="flex gap-4 p-3 sm:p-4">
        <div className="sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 self-start transition-[width] duration-200 lg:block" style={{ width: collapsed && !hovering ? RAIL_W : OPEN_W }}>
          <Sidebar collapsed={collapsed} hovering={hovering} onHoverChange={setHovering} onToggle={toggle} />
        </div>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label={t("nav.closeMenu")} onClick={() => setDrawer(false)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <div className="absolute inset-y-3 left-3 w-[min(272px,calc(100%-1.5rem))]">
              <Sidebar onNavigate={() => setDrawer(false)} className="w-full" />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="sticky top-3 z-30 sm:top-4">
            <TopBar onMenu={() => setDrawer(true)} />
          </div>
          <main className="flex-1 px-1 pb-4 pt-2 sm:px-2">
            <Outlet />
          </main>
          <Footer className="py-2" />
        </div>
      </div>
      <IdleWarning seconds={idle.warning} onStay={idle.stay} onLeave={idle.leave} />
      <SessionEndWarning seconds={sessionEnd.secondsLeft} onClose={sessionEnd.dismiss} onLeave={() => void signOut()} />
      <TransactionPinDialog open={needsTxnPin && !pinDialogClosed} onOpenChange={(open) => !open && setPinDialogClosed(true)} />
    </div>
  );
}
