import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

// "Nothing here yet", shown in a card: a branded icon, what is missing and, when
// it helps, what will appear here (or a button to make something appear).
export default function EmptyState({ title, description, icon = Inbox, action }) {
  const { t } = useTranslation();
  const Icon = icon;
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="brand-gradient flex h-16 w-16 items-center justify-center rounded-2xl text-lime shadow-lg">
        <Icon aria-hidden="true" size={28} strokeWidth={1.7} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-slate-800">{title || t("common.empty")}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
