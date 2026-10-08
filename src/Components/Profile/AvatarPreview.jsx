import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import Avatar from "@/Components/Common/Avatar";
import Button from "@/Components/Common/Button";
import Modal from "@/Components/Common/Modal";
import { useAvatarUrl } from "@/Utils/Lib/avatarImage";

// The profile picture, opened large in a pop-up on a click (as the documents
// are), with a way on to changing it. With no picture yet (just the initial),
// a click goes straight to choosing one.
export default function AvatarPreview({ name, onChange }) {
  const { t } = useTranslation();
  const url = useAvatarUrl();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => (url ? setOpen(true) : onChange())}
        aria-label={url ? t("profile.viewPhoto", { defaultValue: "View photo" }) : t("profile.changePhoto", { defaultValue: "Change photo" })}
        className="block rounded-full transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Avatar name={name} className="h-24 w-24" textClassName="text-4xl" />
      </button>
      <Modal open={open} onOpenChange={setOpen} size="lg" title={t("profile.photo", { defaultValue: "Profile photo" })}>
        {url && <img src={url} alt={name} className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-xl" />}
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              onChange();
            }}
          >
            <Camera size={15} />
            {t("profile.changePhoto", { defaultValue: "Change photo" })}
          </Button>
        </div>
      </Modal>
    </>
  );
}
