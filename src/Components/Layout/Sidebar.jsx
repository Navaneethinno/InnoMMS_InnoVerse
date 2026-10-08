import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layers, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import BrandLogo from "@/Components/Common/BrandLogo";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
import { useSignOut } from "@/Hooks/Auth/useSignOut";
import { navFromMenu, navItems } from "@/Utils/Config/routeConfig";
import { cn } from "@/Utils/Lib/utils";

// The portal's menu: the bank's logo and name on top, every page of the
// signed-in area, then Sign out and Collapse. `collapsed` shrinks it to an icon
// rail (desktop) that opens while the mouse (or keyboard focus) is on it and
// folds back after (`hovering` and `onHoverChange` are the page's, because the
// page moves with it); `onNavigate` closes the drawer on a phone.
export default function Sidebar({ collapsed = false, hovering = false, onHoverChange, onToggle, onNavigate, className }) {
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  const signOut = useSignOut();
  const menu = useSelector((state) => state.auth.user?.menu);
  const unread = useSelector((state) => state.auth.user?.unread) ?? 0;
  const items = menu?.length ? navFromMenu(menu) : navItems;
  // Icons only while collapsed and not being pointed at.
  const slim = collapsed && !hovering;

  return (
    <aside
      className={cn("flex h-full w-full flex-col rounded-2xl border border-ink/[0.06] bg-surface/90 p-3 shadow-[0_14px_30px_-18px_rgb(var(--color-primary)/0.4)] backdrop-blur", className)}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && onHoverChange?.(false)}
    >
      <div className={cn("flex items-center gap-3 rounded-xl border border-black bg-paper/70 p-3 dark:border-white/40", slim && "justify-center px-0")}>
        {logo ? (
          <BrandLogo src={logo} size={44} />
        ) : (
          <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lime">
            <Layers size={20} strokeWidth={1.8} />
          </span>
        )}
        {!slim && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-ink">{t("brand.name")}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{t("brand.portal")}</p>
          </div>
        )}
      </div>

      <nav aria-label={t("nav.main")} className="mt-4 grid gap-1">
        {items.map(({ key, to, labelKey, label, icon }) => {
          const Icon = icon;
          const name = label || t(labelKey);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              title={slim ? name : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition",
                  slim && "justify-center px-0",
                  isActive ? "brand-gradient text-white shadow-md" : "text-slate-600 hover:bg-ink/5 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={cn("shrink-0", isActive && "text-lime")} />
                  {!slim && <span className="truncate">{name}</span>}
                  {key === "notifications" && unread > 0 && (
                    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-on-secondary", slim ? "absolute right-2 top-1.5" : "ml-auto")}>{unread > 99 ? "99+" : unread}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={() => void signOut()}
          title={slim ? t("common.signOut") : undefined}
          className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-300", slim && "justify-center px-0")}
        >
          <LogOut size={17} className="shrink-0" />
          {!slim && t("common.signOut")}
        </button>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={t(collapsed ? "nav.expand" : "nav.collapse")}
            title={slim ? t("nav.expand") : undefined}
            className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-ink/5 hover:text-ink", slim && "justify-center px-0")}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!slim && t(collapsed ? "nav.expand" : "nav.collapse")}
          </button>
        )}
      </div>
    </aside>
  );
}
