import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import Button from "./Button";
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending = false,
}) {
  const { t } = useTranslation();
  return (
    <Modal {...{ open, onOpenChange, title, description, pending }}>
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button pending={pending} onClick={onConfirm}>
          {t("common.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
