import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/Utils/Lib/utils";
import { useDocuments } from "@/Hooks/useDocuments";
export default function Footer({ className }) {
  const { t } = useTranslation();
  const docs = useDocuments();
  return (
    <footer className={cn("py-6 text-center text-xs text-slate-400", className)}>
      {docs?.length > 0 && (
        <nav aria-label={t("docs.legal")} className="mb-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {docs.map((d) => (
            <Link key={d.code} to={`/legal/${encodeURIComponent(d.code)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-500 hover:text-ink hover:underline">
              {d.name || d.title}
            </Link>
          ))}
        </nav>
      )}
      {t("footer.copyright", { year: new Date().getFullYear() })}
    </footer>
  );
}
