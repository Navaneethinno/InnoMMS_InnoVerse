import { CircleAlert } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The one look of a message under a field: a small red line with an icon,
// readable in light and dark mode. The text is the API's own (or a local
// pre-check), shown as is.
export default function FieldError({ id, children, className }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className={cn("mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-4 text-red-600 dark:text-red-300", className)}>
      <CircleAlert aria-hidden="true" size={13} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
