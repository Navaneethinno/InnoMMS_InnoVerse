import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import Avatar from "@/Components/Common/Avatar";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import Modal from "@/Components/Common/Modal";
import { listAvatarPresets, removeAvatar, setAvatar, uploadAvatar } from "@/Services/Profile/profile.api";
import { readAuthUser, updateAuthUser } from "@/Services/api/authStorage";
import { userUpdated } from "@/Redux/slices/authSlice";
import { refreshAvatar } from "@/Utils/Lib/avatarImage";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// "Change photo": one of the institution's pictures, an upload (JPG or PNG), or
// back to the default. Whatever the API answers with is the new avatar; it is
// fetched again everywhere it shows.
export default function AvatarDialog({ open, onOpenChange, avatar, name, onChanged }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const input = useRef(null);
  const [presets, setPresets] = useState([]);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!open) return;
    setProblem("");
    listAvatarPresets()
      .then(setPresets)
      .catch((error) => setProblem(error.message));
  }, [open]);

  const run = async (key, action) => {
    setBusy(key);
    setProblem("");
    try {
      const { data, message } = await action();
      const next = data ?? { kind: "DEFAULT" };
      updateAuthUser({ ...readAuthUser(), avatar: next });
      dispatch(userUpdated({ avatar: next }));
      refreshAvatar();
      onChanged(next);
      if (message) notifications.success(message);
      onOpenChange(false);
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy("");
    }
  };
  const chosen = avatar?.kind === "PRESET" ? avatar.code : "";

  return (
    <Modal open={open} onOpenChange={onOpenChange} pending={Boolean(busy)} title={t("profile.changePhoto", { defaultValue: "Change photo" })}>
      <div className="space-y-5">
        {problem && <ErrorState message={problem} />}
        <div className="flex justify-center">
          <Avatar name={name} className="h-24 w-24" textClassName="text-3xl" />
        </div>
        {presets.length > 0 && (
          <ul className="grid grid-cols-4 gap-3" aria-label={t("profile.pictures", { defaultValue: "Pictures" })}>
            {presets.map((preset) => (
              <li key={preset.code}>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void run(preset.code, () => setAvatar(preset.code))}
                  aria-label={preset.label}
                  aria-pressed={chosen === preset.code}
                  title={preset.label}
                  className={cn("w-full rounded-full p-0.5 transition disabled:opacity-60", chosen === preset.code ? "ring-2 ring-ink" : "ring-1 ring-slate-200 hover:ring-ink/50")}
                >
                  <Avatar code={preset.code} className="aspect-square h-auto w-full" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void run("upload", () => uploadAvatar(file));
          }}
        />
        <Button variant="secondary" className="w-full" pending={busy === "upload"} disabled={Boolean(busy)} onClick={() => input.current?.click()}>
          <Upload size={16} /> {t("profile.upload", { defaultValue: "Upload a photo" })}
        </Button>
        <p className="text-center text-xs text-slate-500">{t("profile.uploadHint", { defaultValue: "JPG or PNG, up to 2 MB." })}</p>
        {avatar && avatar.kind !== "DEFAULT" && (
          <div className="text-center">
            <button type="button" disabled={Boolean(busy)} onClick={() => void run("remove", removeAvatar)} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60 dark:text-red-300">
              {t("profile.removePhoto", { defaultValue: "Remove photo" })}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
