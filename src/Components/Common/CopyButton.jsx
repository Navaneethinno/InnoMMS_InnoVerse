import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// Copy to the clipboard; swaps to a tick for a moment instead of a toast.
// `label` shows text next to the icon (else icon only).
export default function CopyButton({ value, label, size = 15, className }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard (insecure page, refused): nothing to say for a convenience.
    }
  };
  const text = copied ? t("ext.copied") : t("ext.copy");
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={text}
      title={label ? undefined : text}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 font-semibold text-ink transition hover:bg-ink/5",
        label ? "px-4 py-2.5 text-sm" : "p-2",
        className,
      )}
    >
      {copied ? (
        <Check size={size} className="text-emerald-500" />
      ) : (
        <Copy size={size} />
      )}
      {label && (copied ? t("ext.copied") : label)}
    </button>
  );
}
