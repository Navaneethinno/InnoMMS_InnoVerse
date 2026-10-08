import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";
export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  pending = false,
  size = "md",
}) {
  const { t } = useTranslation();
  const returnFocus = useRef(null);
  return (
    <Dialog.Root open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
          {...(!description ? { "aria-describedby": undefined } : {})}
          onEscapeKeyDown={(e) => {
            if (pending) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (pending) e.preventDefault();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-7 shadow-2xl",
            size === "lg" ? "max-w-3xl" : "max-w-md",
          )}
        >
          <Dialog.Title className="pr-8 text-xl font-semibold text-ink">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-3 text-sm leading-relaxed text-slate-500">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-6">{children}</div>
          <Dialog.Close
            disabled={pending}
            aria-label={t("common.close")}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 disabled:opacity-40"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
