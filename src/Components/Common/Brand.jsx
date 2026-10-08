import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import BrandLogo from "./BrandLogo";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
export default function Brand({ inverse = false }) {
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  return (
    <div
      className={`flex items-center gap-2.5 ${inverse ? "text-white" : "text-ink"}`}
    >
      {logo ? (
        <BrandLogo src={logo} size={40} tone={inverse ? "dark" : "light"} />
      ) : (
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${inverse ? "bg-lime text-on-secondary" : "bg-forest text-lime"}`}
        >
          <Layers size={21} strokeWidth={1.7} />
        </span>
      )}
      <span className="text-xl font-semibold tracking-tight">
        {t("brand.name")}
      </span>
    </div>
  );
}
