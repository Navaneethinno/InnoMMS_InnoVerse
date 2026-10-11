import { createElement } from "react";
import { useLocation } from "react-router-dom";
import { navScreens } from "@/Utils/Config/routeConfig";
import { cn } from "@/Utils/Lib/utils";

// A page's heading, as every screen shows it: large and bold, after the icon
// its screen has in the sidebar (or `icon`), with a line under it and, on the
// right, the page's own controls (tabs, buttons).
export default function PageTitle({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
}) {
  const { pathname } = useLocation();
  const glyph =
    icon ??
    Object.values(navScreens).find((screen) => screen.to === pathname)?.icon;
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-800">
          {glyph && (
            <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lime shadow-md">
              {createElement(glyph, { size: 18 })}
            </span>
          )}
          <span className="min-w-0">{title}</span>
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        )}
        {children}
      </div>
      {actions}
    </div>
  );
}
