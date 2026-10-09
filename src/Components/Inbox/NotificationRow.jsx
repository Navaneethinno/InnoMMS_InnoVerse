import { cn } from "@/Utils/Lib/utils";

// One notification in the list: its kind's icon, title and one-line summary,
// with the amount and time on the right. Unread ones are marked with a dot and
// a bolder title; the one open in the details panel is highlighted.
export default function NotificationRow({ title, summary, amount, direction, when, dateTime, unread, selected, icon, type, unreadLabel, onOpen }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "notif-focus relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition sm:px-5",
        selected ? "bg-ink/[0.06]" : "hover:bg-ink/[0.03]",
      )}
    >
      {selected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-forest dark:bg-lime" />}
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", `notif-tile-${type}`)} aria-hidden="true">
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {unread && <span className="notif-dot h-2 w-2 shrink-0 rounded-full" role="img" aria-label={unreadLabel} />}
          <span className={cn("truncate text-sm text-ink", unread ? "font-bold" : "font-semibold")}>{title}</span>
        </span>
        <span className="notif-muted mt-0.5 block truncate text-[13px]">{summary}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {amount && (
          <span className={cn("text-sm font-bold tabular-nums", direction === "in" ? "notif-in" : "text-ink")}>
            {direction === "in" ? "+" : direction === "out" ? "−" : ""}
            {amount}
          </span>
        )}
        <time dateTime={dateTime} className="notif-muted text-xs">
          {when}
        </time>
      </span>
    </button>
  );
}
