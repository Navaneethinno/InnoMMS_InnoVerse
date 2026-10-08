import { Loader2 } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
export default function Spinner({ className }) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("h-5 w-5 animate-spin", className)}
    />
  );
}
