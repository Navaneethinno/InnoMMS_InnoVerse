import { createElement } from "react";
import { useLocation } from "react-router-dom";
import { navScreens } from "@/Utils/Config/routeConfig";
import { cn } from "@/Utils/Lib/utils";

// A page's heading, as every screen shows it: large and bold, after the icon
// its screen has in the sidebar (or `icon`), with a line under it and, on the
// right, the page's own controls (tabs, buttons).
// The screen's sidebar icon, as a badge before its title.
function ScreenIcon({ icon }) {
  const { pathname } = useLocation();
  const glyph =
    icon ??
    Object.values(navScreens).find((screen) => screen.to === pathname)?.icon;
  if (!glyph) return null;
  return (
    <span className="brand-gradient dark:bg-none dark:bg-lime/15 dark:ring-1 dark:ring-lime/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lime shadow-md">
      {createElement(glyph, { size: 18 })}
    </span>
  );
}

// Just the title line (for pages that lay out their own header).
export function PageHeading({ icon, children, className }) {
  return (
    <h1
      className={cn(
        "flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-800",
        className,
      )}
    >
      <ScreenIcon icon={icon} />
      <span className="min-w-0">{children}</span>
    </h1>
  );
}

export default function PageTitle({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <PageHeading icon={icon}>{title}</PageHeading>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        )}
        {children}
      </div>
      {actions}
    </div>
  );
}
