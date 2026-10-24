import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Power, PowerOff } from "lucide-react";
import Button from "@/Components/Common/Button";
import ConfirmDialog from "@/Components/Common/ConfirmDialog";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// What terminal profiles and shifts share: their Active / Inactive badge and
// the button that switches one off (with what that does) or back on.
export const ACTIVE_TONE = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
export const INACTIVE_TONE = "bg-slate-500/15 text-slate-600";

export function Pill({ tone, children }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone)}>{children}</span>;
}

export function StatusPill({ status }) {
  const { t } = useTranslation();
  return status === "ACTIVE" ? (
    <Pill tone={ACTIVE_TONE}>{t("myAgents.active", { defaultValue: "Active" })}</Pill>
  ) : (
    <Pill tone={INACTIVE_TONE}>{t("myAgents.inactive", { defaultValue: "Inactive" })}</Pill>
  );
}

// `warning`: what deactivating does to the users who have it.
export function ActiveToggle({ item, warning, onToggle, onDone }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const active = item.status === "ACTIVE";
  const run = async () => {
    setPending(true);
    try {
      await onToggle(item.id, !active);
      notifications.success(active ? t("pos.deactivated", { defaultValue: "Deactivated." }) : t("pos.activated", { defaultValue: "Activated." }));
      setOpen(false);
      onDone();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className={cn("px-3 py-2", active && "text-red-600")}>
        {active ? <PowerOff size={14} /> : <Power size={14} />}{" "}
        {active ? t("pos.deactivate", { defaultValue: "Deactivate" }) : t("pos.activate", { defaultValue: "Activate" })}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        pending={pending}
        title={active ? t("pos.deactivateTitle", { name: item.name, defaultValue: "Deactivate {{name}}?" }) : t("pos.activateTitle", { name: item.name, defaultValue: "Activate {{name}}?" })}
        description={active ? warning : undefined}
        onConfirm={run}
      />
    </>
  );
}
