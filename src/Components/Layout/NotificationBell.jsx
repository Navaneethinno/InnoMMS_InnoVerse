import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The bell in the top bar: a round button like the theme toggle that opens the
// notifications page, with the unread count on it. Hidden when the menu says
// this customer has no notifications.
export default function NotificationBell() {
  const { t } = useTranslation();
  const enabled = useSelector((state) => state.auth.user?.features?.notifications) !== false;
  const unread = useSelector((state) => state.auth.user?.unread) ?? 0;
  if (!enabled) return null;
  const label = unread > 0 ? `${t("nav.notifications")} (${unread})` : t("nav.notifications");
  return (
    <NavLink
      to="/notifications"
      aria-label={label}
      title={t("nav.notifications")}
      className={({ isActive }) =>
        cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink transition hover:border-ink hover:bg-ink/5",
          isActive && "border-ink bg-ink/5",
        )
      }
    >
      <Bell size={16} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </NavLink>
  );
}
