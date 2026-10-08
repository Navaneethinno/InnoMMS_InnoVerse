import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import LanguageToggle from "@/Components/Common/LanguageToggle";
import ThemeToggle from "@/Components/Common/ThemeToggle";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

// The bar across the top of the signed-in pages: the portal's name on the
// left (and the menu button on a phone), language, theme, the notifications
// bell and the signed-in customer (with their menu) on the right.
export default function TopBar({ onMenu }) {
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth.user);
  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-ink/[0.06] bg-surface/90 px-4 py-3 shadow-[0_14px_30px_-18px_rgb(var(--color-primary)/0.4)] backdrop-blur sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t("nav.menu")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/15 text-ink transition hover:bg-ink/5 lg:hidden"
        >
          <Menu size={19} />
        </button>
        <p className="hidden truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">{t("brand.portal")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 min-[360px]:gap-2 sm:gap-3">
        <LanguageToggle className="w-[104px] max-[359px]:w-[84px] sm:w-[130px] [&_button]:px-3 sm:[&_button]:px-4" />
        <ThemeToggle className="h-9 w-9 border-ink/15" />
        <NotificationBell />
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}
