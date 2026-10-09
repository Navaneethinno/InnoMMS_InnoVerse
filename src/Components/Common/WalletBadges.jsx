import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";

// What is notable about a wallet, as small chips: a restriction (frozen,
// blocked, dormant, waiting for its first deposit or for activation) and, for a
// wallet the merchant operates for someone else (a joint wallet, a minor's),
// whose it is. Nothing is drawn for an ordinary wallet of their own.
const SEVERE = new Set(["FROZEN", "BLOCKED"]);

export default function WalletBadges({ wallet, className }) {
  const { t } = useTranslation();
  const restriction = wallet?.restriction;
  // `owner` is there only on a shared wallet (a joint holder's, a guardian's).
  const owner = wallet?.owner?.name;
  // An agent's float and a store's own wallet are not "my money": say so.
  const purpose = wallet?.wallet_purpose === "AGENT_FLOAT" || wallet?.wallet_purpose === "STORE" ? wallet.wallet_purpose : null;
  if (!restriction && !owner && !purpose) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {purpose && (
        <span className="rounded-full bg-lime/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
          {purpose === "AGENT_FLOAT"
            ? t("wallet.purpose.AGENT_FLOAT", { defaultValue: "Agent wallet" })
            : t("wallet.purpose.STORE", { defaultValue: "Store wallet" }) + (wallet.store_name ? ` · ${wallet.store_name}` : "")}
        </span>
      )}
      {restriction && (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            SEVERE.has(restriction) ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          )}
        >
          {t(`wallet.restriction.${restriction}`, { defaultValue: restriction.replaceAll("_", " ").toLowerCase() })}
        </span>
      )}
      {owner && <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">{t("wallet.owner", { name: owner })}</span>}
    </div>
  );
}
