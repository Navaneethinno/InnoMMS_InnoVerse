import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";

// The portal's floating header card: logo lockup on the left, language and
// theme switches plus a page-specific `action` on the right. Meant to sit
// at the top of a page section; the page supplies the section around it.
export default function AppHeader({ action }) {
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  return (
    <header className="flex items-center justify-between gap-3 rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3 shadow-[0_14px_30px_-18px_rgb(var(--color-primary)/0.4)] sm:px-[22px] sm:py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {logo ? (
          <BrandLogo src={logo} size={40} />
        ) : (
          <span className="brand-gradient flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-white">
            <Layers size={19} strokeWidth={1.8} />
          </span>
        )}
        <span className="hidden truncate text-[19px] font-semibold min-[440px]:inline tracking-[-0.02em] text-ink">{t("brand.name")}</span>
        <span aria-hidden="true" className="ml-1.5 hidden h-5 w-px bg-ink/15 sm:block" />
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 sm:block">
          {t("brand.portal")}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <LanguageToggle />
        <ThemeToggle className="h-[34px] w-[34px] border-ink/15" />
        {action}
      </div>
    </header>
  );
}
