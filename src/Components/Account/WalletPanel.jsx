import { useTranslation } from "react-i18next";
import { Check, Landmark } from "lucide-react";
import FitText from "@/Components/Common/FitText";
import WalletBadges from "@/Components/Common/WalletBadges";
import { formatDate, formatMoney } from "@/Utils/Lib/format";
import { cn } from "@/Utils/Lib/utils";

// The merchant's Active wallets beside the payment form: which one the money
// leaves, with what is in it. It is one card, as tall as the form next to it,
// holding a block per wallet (product, number, currency, available and ledger
// balance, loyalty points, status, opened). With several wallets the blocks are
// the choice; `selected` is the one in use (the merchant's pick, or the one the
// server would use). Figures shrink to fit, so a very large balance stays whole.
function Row({ label, children }) {
  if (children == null || children === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-slate-700">{children}</dd>
    </div>
  );
}

export default function WalletPanel({ wallets, selected, onSelect, footer, className }) {
  const { t, i18n } = useTranslation();
  if (!wallets?.length) return null;
  const several = wallets.length > 1;
  return (
    <aside aria-label={t("send.yourWallets")} className={cn("flex h-full min-w-0 flex-col rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm", className)}>
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">{several ? t("send.yourWallets") : t("send.payingFrom")}</p>
      <ul className="flex flex-1 flex-col gap-3">
        {wallets.map((wallet) => {
          const active = wallet.acct_num === selected?.acct_num;
          const Wrapper = several ? "button" : "div";
          const loyalty = Number(wallet.loyalty_point);
          return (
            <li key={wallet.acct_num} className={cn(!several && "flex flex-1 flex-col")}>
              <Wrapper
                {...(several ? { type: "button", onClick: () => onSelect(wallet.acct_num), "aria-pressed": active } : {})}
                className={cn(
                  "flex w-full flex-col rounded-2xl border bg-paper/60 p-5 text-left transition",
                  !several && "flex-1",
                  several && active ? "border-ink ring-2 ring-ink/20" : "border-slate-200",
                  several && !active && "hover:border-ink/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lime shadow-md">
                    <Landmark size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-bold text-slate-800">{wallet.acct_product_name ?? wallet.digital_product_name ?? wallet.acct_num}</p>
                    <p className="break-all text-xs text-slate-500">{wallet.acct_num}</p>
                    <WalletBadges wallet={wallet} className="mt-1.5" />
                  </div>
                  {several && active && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-surface">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">{t("send.available")}</p>
                <FitText max={26} min={12} className="mt-1 font-black tracking-tight text-slate-800">
                  {formatMoney(wallet.avail_bal, wallet.currency_code)}
                </FitText>
                {/* Pushed to the bottom so the card fills the height of the form. */}
                <dl className="mt-auto divide-y divide-slate-200/70 border-t border-slate-200/70 pt-3">
                  {wallet.ledger_bal != null && Number(wallet.ledger_bal) !== Number(wallet.avail_bal) && <Row label={t("send.ledger")}>{formatMoney(wallet.ledger_bal, wallet.currency_code)}</Row>}
                  <Row label={t("send.currency")}>{[wallet.currency_name, wallet.currency_code].filter(Boolean).join(" · ")}</Row>
                  {loyalty > 0 && <Row label={t("send.points")}>{loyalty.toLocaleString(i18n.resolvedLanguage)}</Row>}
                  <Row label={t("send.status")}>
                    {wallet.status_name && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", wallet.status === 1 || wallet.status_name === "Active" ? "bg-emerald-500" : "bg-amber-500")} />
                        {wallet.status_name}
                      </span>
                    )}
                  </Row>
                  <Row label={t("send.opened")}>{wallet.opened_at ? formatDate(wallet.opened_at) : null}</Row>
                </dl>
              </Wrapper>
            </li>
          );
        })}
      </ul>
      {footer}
    </aside>
  );
}
