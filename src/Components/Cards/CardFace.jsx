import { useTranslation } from "react-i18next";
import { Wifi } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";

// The name printed on the plastic: an instant card from stock carries none;
// any other falls back to the holder's name.
export const cardName = (card) => card.name_on_card || (card.perso_mode === "INSTANT" ? "" : card.holder_name) || "";

// Statuses where the card cannot be used: the face is dimmed.
const STOPPED = ["BLOCKED", "LOST", "STOLEN", "HOTLISTED", "EXPIRED", "CLOSED"];

// A card drawn as a card: network, masked number, name and expiry, and its
// status. `selected` rings it; the whole face is a button.
export default function CardFace({ card, selected, onClick }) {
  const { t } = useTranslation();
  const stopped = STOPPED.includes(card.ops_status);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "brand-gradient relative flex aspect-[1.586] min-h-[10.5rem] w-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl",
        selected ? "ring-4 ring-lime/70" : "hover:ring-2 hover:ring-lime/40",
        stopped && "opacity-60 grayscale",
      )}
    >
      <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/[0.06]" aria-hidden="true" />
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{card.product_name}</span>
          <span className="block text-[11px] uppercase tracking-wider text-white/70">
            {t(`cards.class.${card.product_class}`, { defaultValue: card.product_class })} · {t(`cards.form.${card.form_factor}`, { defaultValue: card.form_factor })}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{t(`cards.ops.${card.ops_status}`, { defaultValue: card.ops_status })}</span>
      </span>
      {card.form_factor === "PHYSICAL" ? <span className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" aria-hidden="true" /> : <Wifi size={22} className="rotate-90 text-white/70" aria-hidden="true" />}
      <span>
        <span className="block whitespace-nowrap font-mono text-base font-semibold tracking-[0.1em]">{card.pan_masked}</span>
        <span className="mt-1 flex items-end justify-between gap-2 text-xs">
          <span className="min-w-0 truncate uppercase tracking-wide">{cardName(card)}</span>
          <span className="shrink-0 font-mono">{card.expiry}</span>
          <span className="shrink-0 font-black italic tracking-tight">{card.network_code}</span>
        </span>
      </span>
    </button>
  );
}
