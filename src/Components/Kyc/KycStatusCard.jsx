import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Hourglass } from "lucide-react";
import { useKycStatus } from "@/Hooks/Kyc/useKycStatus";

// The nudge to complete the next verification level, from `kyc/status`:
// nothing when there is nothing to do (AT_TOP, LOCKED, or no levels).
export default function KycStatusCard() {
  const { t } = useTranslation();
  const status = useKycStatus();
  if (!status || status.no_kyc_levels) return null;
  const { state, can_upgrade: canUpgrade } = status;
  const waiting = state === "WAITING";
  const rejected = state === "REJECTED";
  if (!waiting && !rejected && !(state === "NONE" && canUpgrade) && state !== "IN_PROGRESS") return null;

  const title = waiting
    ? t("kyc.waitingTitle", { defaultValue: "We are checking your details" })
    : rejected
      ? t("kyc.rejectedTitle", { defaultValue: "Your details were not accepted" })
      : state === "IN_PROGRESS"
      ? t("kyc.continueTitle", { defaultValue: "Continue your verification" })
      : t("kyc.startTitle", { defaultValue: "Complete your verification" });
  const body = waiting
    ? t("kyc.waitingBody", { defaultValue: "You can keep using your account meanwhile." })
    : rejected
      ? status.narration
      : t("kyc.body", { defaultValue: "Verify more of your details to unlock more of your account." });
  const Icon = waiting ? Hourglass : BadgeCheck;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-ink/15 bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
      <span className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lime">
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{body}</p>
      </div>
      {!waiting && (
        <Link to="/verification" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest/90 dark:bg-lime dark:text-on-secondary">
          {state === "IN_PROGRESS" ? t("kyc.continue", { defaultValue: "Continue" }) : rejected ? t("kyc.tryAgain", { defaultValue: "Try again" }) : t("kyc.start", { defaultValue: "Start" })}
          <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
