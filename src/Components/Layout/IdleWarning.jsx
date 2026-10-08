import { useTranslation } from "react-i18next";
import Button from "@/Components/Common/Button";
import Modal from "@/Components/Common/Modal";

// "Are you still there?": shown shortly before the session ends for lack of
// activity. Staying makes an API call, which resets the server's clock.
export default function IdleWarning({ seconds, onStay, onLeave }) {
  const { t } = useTranslation();
  return (
    <Modal open={seconds != null} onOpenChange={(open) => !open && onStay()} title={t("idle.title")} description={t("idle.description", { seconds: seconds ?? 0 })}>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onLeave}>
          {t("common.signOut")}
        </Button>
        <Button onClick={onStay}>{t("idle.stay")}</Button>
      </div>
    </Modal>
  );
}
