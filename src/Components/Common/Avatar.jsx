import { useAvatarUrl } from "@/Utils/Lib/avatarImage";
import { cn } from "@/Utils/Lib/utils";

// A round avatar: the customer's own picture (or the preset `code`), and their
// initial on the brand colour until it has loaded or if it cannot be.
export default function Avatar({ name = "", code, className, textClassName = "text-sm" }) {
  const url = useAvatarUrl(code);
  return url ? (
    <img src={url} alt="" className={cn("shrink-0 rounded-full bg-slate-100 object-cover", className)} />
  ) : (
    <span aria-hidden="true" className={cn("brand-gradient flex shrink-0 items-center justify-center rounded-full font-bold uppercase text-lime", textClassName, className)}>
      {name.charAt(0) || "?"}
    </span>
  );
}
