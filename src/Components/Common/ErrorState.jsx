import { CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "./Button";
export default function ErrorState({ message, problems, onRetry }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      <div className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">{message || t("common.requestFailed")}</p>
          {problems?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {problems.map((problem, index) => (
                <li key={index}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onRetry && (
        <Button className="mt-3" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
