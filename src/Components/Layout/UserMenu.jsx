import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import Avatar from "@/Components/Common/Avatar";
import { usePolicy } from "@/Hooks/Auth/usePolicy";
import { useSignOut } from "@/Hooks/Auth/useSignOut";
import { cn } from "@/Utils/Lib/utils";

// The signed-in customer in the top bar: their name and initial, and on click
// a small menu with who they are (name, the bank, their login) and what they
// can do: change their password (on the Security page) and sign out. Closes on
// an outside click, Escape, and when the page changes.
export default function UserMenu({ user }) {
  const { t } = useTranslation();
  const signOut = useSignOut();
  const passwordLogin = usePolicy().login.methods.includes("PASSWORD");
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const name = user?.name ?? user?.username ?? "";

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => !root.current?.contains(event.target) && setOpen(false);
    const escape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.account")}
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-left transition hover:bg-ink/5 sm:pr-3"
      >
        <Avatar name={name} className="h-9 w-9" />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block max-w-[180px] truncate text-sm font-bold text-slate-800">{name}</span>
          {user?.username && user.username !== name && <span className="block max-w-[180px] truncate text-[11px] text-slate-500">{user.username}</span>}
        </span>
        <ChevronDown size={15} className={cn("hidden shrink-0 text-slate-500 transition sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl">
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-[13px] font-bold text-slate-800">{name}</p>
            <p className="truncate text-[11px] text-slate-500">{[t("brand.name"), user?.username !== name ? user?.username : null].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="border-t border-slate-100 pt-1.5">
            <Link to="/profile" role="menuitem" className={cn(item, "text-slate-700 hover:bg-ink/5")}>
              <UserRound size={16} className="shrink-0" />
              {t("nav.profile", { defaultValue: "My profile" })}
            </Link>
            {passwordLogin ? (
              <Link to="/security" role="menuitem" className={cn(item, "text-slate-700 hover:bg-ink/5")}>
                <KeyRound size={16} className="shrink-0" />
                {t("security.password")}
              </Link>
            ) : (
              <Link to="/security" role="menuitem" className={cn(item, "text-slate-700 hover:bg-ink/5")}>
                <KeyRound size={16} className="shrink-0" />
                {t("security.changePin")}
              </Link>
            )}
            <button type="button" role="menuitem" onClick={() => void signOut()} className={cn(item, "text-red-600 hover:bg-red-500/10 dark:text-red-300")}>
              <LogOut size={15} className="shrink-0" />
              {t("common.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
