import { useTranslation } from "react-i18next";
import { useLanguages } from "@/Hooks/Branding/useLanguages";
import FilterSelect from "./FilterSelect";
import { cn } from "@/Utils/Lib/utils";

// Pill-shaped language dropdown, shared by the sign-in page and the header.
export default function LanguageToggle({ className }) {
  const { t, i18n } = useTranslation();
  const languages = useLanguages();
  return (
    <div
      className={cn(
        "w-[130px] [&_label]:sr-only [&_button]:h-9 [&_button]:rounded-full [&_button]:border [&_button]:border-ink/20 [&_button]:bg-surface [&_button]:px-4 [&_button]:py-0 [&_button]:text-sm [&_button]:font-medium [&_button]:hover:border-ink",
        className,
      )}
    >
      <FilterSelect
        label={t("common.language")}
        value={i18n.language || "en"}
        onChange={(value) => i18n.changeLanguage(value)}
        options={languages}
      />
    </div>
  );
}
