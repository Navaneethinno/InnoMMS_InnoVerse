import { useTranslation } from "react-i18next";
import Spinner from "./Spinner";
import { cn } from "@/Utils/Lib/utils";
export default function LoadingState({ className }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-3 p-6 text-sm text-slate-500",
        className,
      )}
    >
      <Spinner />
      {t("common.loading")}
    </div>
  );
}
