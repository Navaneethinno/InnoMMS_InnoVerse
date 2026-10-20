import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import { matchContacts } from "@/Services/Account/account.api";
import { readRecentPayees } from "@/Utils/Lib/recentPayees";
import { cn } from "@/Utils/Lib/utils";

// The numbers paid lately, as chips that fill the number box. Their names come
// from contacts/match; a number that is not on e-taku yet shows as itself.
// Nothing is shown when there are none.
export default function RecentPayees({ onPick, className }) {
  const { t } = useTranslation();
  const [payees, setPayees] = useState([]);

  useEffect(() => {
    const numbers = readRecentPayees();
    if (!numbers.length) return undefined;
    let live = true;
    setPayees(numbers.map((phone) => ({ phone })));
    matchContacts(numbers)
      .then((rows) => {
        if (!live) return;
        const digits = (value) => String(value ?? "").replace(/\D/g, "");
        setPayees(numbers.map((phone) => ({ phone, name: rows.find((row) => digits(row.phone_number) === digits(phone))?.name })));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!payees.length) return null;
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{t("send.recent", { defaultValue: "Recent" })}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {payees.map((payee) => (
          <button
            key={payee.phone}
            type="button"
            onClick={() => onPick(payee.phone)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-left text-xs transition hover:bg-ink/5"
          >
            <UserRound size={14} className="shrink-0 text-slate-500" />
            <span className="font-semibold text-slate-800">{payee.name ?? payee.phone}</span>
            {payee.name && <span className="text-slate-500">{payee.phone}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
