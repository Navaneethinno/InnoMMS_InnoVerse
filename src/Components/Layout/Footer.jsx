import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";
export default function Footer({ className }) {
  const { t } = useTranslation();
  return (
    <footer className={cn("py-6 text-center text-xs text-slate-400", className)}>
      {t("footer.copyright", { year: new Date().getFullYear() })}
    </footer>
  );
}
