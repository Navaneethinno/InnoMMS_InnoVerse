import { useTranslation } from "react-i18next";
import Button from "@/Components/Common/Button";
import Modal from "@/Components/Common/Modal";

// "Your session ends soon": shown a minute or two before the session's last
// moment. Unlike the idle question, being active does not extend it; the customer
// finishes what they are doing and signs in again.
export default function SessionEndWarning({ seconds, onClose, onLeave }) {
  const { t } = useTranslation();
  const minutes = Math.floor((seconds ?? 0) / 60);
  const rest = (seconds ?? 0) % 60;
  const left = minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
  return (
    <Modal
      open={seconds != null}
      onOpenChange={(open) => !open && onClose()}
      title={t("auth.sessionEndsSoon", { defaultValue: "Your session ends soon" })}
      description={t("auth.sessionEndsIn", { defaultValue: "For your security this session ends in {{left}}. Finish what you are doing; you will need to sign in again.", left })}
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onLeave}>
          {t("common.signOut")}
        </Button>
        <Button onClick={onClose}>{t("common.ok", { defaultValue: "OK" })}</Button>
      </div>
    </Modal>
  );
}
