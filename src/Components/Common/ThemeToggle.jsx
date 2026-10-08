import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/Hooks/Theme/useTheme";
import { cn } from "@/Utils/Lib/utils";

export default function ThemeToggle({ className }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark ? t("common.lightMode") : t("common.darkMode");
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink/25 text-ink transition hover:border-ink hover:bg-ink/5",
        className,
      )}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
