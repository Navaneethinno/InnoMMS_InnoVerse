import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCheck, Copy } from "lucide-react";
import DetailRow from "@/Components/Common/DetailRow";
import { formatDateTime } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

const FIELD_NAMES = { from: "From", account: "Account", reference: "Reference", balance: "Available balance" };

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

// One notification in full: what it is and when, the amount large, the
// details read from its message, the message itself, and copying the
// reference. Shown in the panel beside the list, or in a pop-up on a phone.
export default function NotificationDetail({ item, info, title, icon }) {
  const Icon = icon;
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => setCopied(false), [item.id]);

  const reference = info.details.find((detail) => detail.key === "reference")?.value;
  const copy = async () => {
    await copyText(reference);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    // .notif carries the colours: a pop-up is drawn outside the page.
    <div className="notif">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", `notif-tile-${info.type}`)} aria-hidden="true">
          <Icon size={20} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-ink [overflow-wrap:anywhere]">{title}</h2>
          <p className="notif-muted mt-1 text-sm">{formatDateTime(item.created_at)}</p>
        </div>
      </div>

      {info.amount && (
        <p className={cn("mt-6 text-3xl font-black tracking-tight tabular-nums", info.direction === "in" ? "notif-in" : "text-ink")}>
          {info.direction === "in" ? "+" : info.direction === "out" ? "−" : ""}
          {info.amount.text}
        </p>
      )}

      {info.details.length > 0 && (
        <dl className="mt-5 rounded-2xl border border-slate-200 px-4">
          {info.details.map((detail) => (
            <DetailRow key={detail.key} label={t(`inbox.field.${detail.key}`, { defaultValue: FIELD_NAMES[detail.key] })}>
              <span className="tabular-nums">{detail.value}</span>
            </DetailRow>
          ))}
        </dl>
      )}

      <div className="mt-5">
        <p className="notif-muted mb-1.5 text-xs font-bold uppercase tracking-widest">{t("inbox.message", { defaultValue: "Message" })}</p>
        <p className="notif-detail whitespace-pre-line rounded-2xl p-4 text-sm leading-6 text-ink [overflow-wrap:anywhere]">{item.body}</p>
      </div>

      {reference && (
        <button
          type="button"
          onClick={() => void copy()}
          className="notif-focus mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-ink/25 bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-ink/5"
        >
          {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
          {copied ? t("inbox.copied", { defaultValue: "Copied" }) : t("inbox.copyRef", { defaultValue: "Copy reference" })}
        </button>
      )}
    </div>
  );
}
