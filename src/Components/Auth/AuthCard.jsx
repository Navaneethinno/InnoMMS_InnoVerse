import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppHeader from "@/Components/Common/AppHeader";
import Footer from "@/Components/Layout/Footer";

// The shell of the pre-sign-in pages (activate access, forgot password): the
// same floating header card as sign-up, the brand's soft gradient, and one
// centred card.
export default function AuthCard({ title, description, children, wide = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-paper bg-fixed bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.28),rgb(var(--color-secondary)/0.16)_50%,rgb(var(--color-secondary)/0.26))] dark:bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.07),rgb(var(--color-secondary)/0.02)_50%,rgb(var(--color-secondary)/0.06))]">
      {/* Floating header card, pinned to the top while the page scrolls. */}
      <div className="sticky top-0 z-30 px-4 pt-4 sm:px-10 sm:pt-5 xl:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <AppHeader
            action={
              <button
                type="button"
                onClick={() => navigate("/login")}
                aria-label={t("auth.backToSignIn")}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-forest px-3 py-2 text-sm font-bold text-forest transition hover:bg-forest/5 sm:px-5 sm:py-2.5 dark:border-lime dark:text-lime dark:hover:bg-lime/10"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">{t("auth.backToSignIn")}</span>
              </button>
            }
          />
        </div>
      </div>
      <main className={`mx-auto flex w-full flex-1 flex-col px-4 py-8 sm:px-0 ${wide ? "max-w-3xl" : "max-w-md justify-center"}`}>
        <div className="rounded-3xl border border-slate-200 bg-surface p-7 shadow-sm sm:p-8">
          <h1 className="font-display text-[26px] font-medium leading-tight tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
      <Footer className="py-4" />
    </div>
  );
}
