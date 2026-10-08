import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import Modal from "@/Components/Common/Modal";
import OtpInput from "@/Components/Common/OtpInput";
import { ONBOARDING_CODE } from "@/Utils/Constant";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const secondsUntil = (iso) => {
  const end = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(end) ? Math.max(0, Math.round((end - Date.now()) / 1000)) : 0;
};

// A code stands between the contact and the application: a new contact is
// verified with the code sent to it, and an application in progress opens only
// with the code the API sent to its own email or phone. Wrong codes keep the box open (the API says how many
// tries are left); once the code is spent or has expired, "Send a new code"
// asks for another.
export default function OnboardingCodeDialog({ flow }) {
  const { t } = useTranslation();
  const { codeStage, codeError, codeState, confirmingCode, confirmCode, resendCode, cancelCode, starting } = flow;
  const [code, setCode] = useState("");
  const codeLength = usePortalPolicy().otp.length;
  // Seconds left on this code, and until another one may be asked for.
  const [left, setLeft] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!codeStage) return undefined;
    setCode("");
    setLeft(secondsUntil(codeStage.expires_at));
    setCooldown(ONBOARDING_CODE.resendSeconds);
    const timer = window.setInterval(() => {
      setLeft((value) => Math.max(0, value - 1));
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeStage]);

  // A wrong code is cleared so the next try starts fresh.
  useEffect(() => {
    if (codeError) setCode("");
  }, [codeError]);

  const verifying = codeStage?.kind === "verify";
  const ready = code.length === codeLength;
  // Spent, expired or out of tries: another code is the only way on.
  const expired = left <= 0 || codeState === "invalid";
  const blocked = codeState === "blocked";
  return (
    <Modal
      open={Boolean(codeStage)}
      onOpenChange={(open) => !open && cancelCode()}
      pending={confirmingCode}
      title={t(verifying ? "code.verifyTitle" : "resume.title")}
      description={t(verifying ? "code.verifyDescription" : "resume.description", { to: codeStage?.sent_to ?? "" })}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !confirmingCode) void confirmCode(code);
        }}
      >
        {codeError && <ErrorState message={codeError} />}
        <OtpInput length={codeLength} value={code} onChange={setCode} disabled={confirmingCode || expired || blocked} invalid={Boolean(codeError)} label={t("resume.digit")} />
        <p className="text-center text-xs text-slate-500">{expired ? t("resume.expired") : t("resume.validFor", { time: clock(left) })}</p>
        <Button type="submit" pending={confirmingCode} disabled={!ready || expired || blocked} className="w-full">
          {t("resume.open")}
        </Button>
        <p className="text-center text-sm text-slate-500">
          {blocked ? (
            t("resume.wait")
          ) : cooldown > 0 && !expired ? (
            t("resume.resendIn", { time: clock(cooldown) })
          ) : (
            <button type="button" disabled={starting || confirmingCode} onClick={() => void resendCode()} className="font-semibold text-ink hover:underline disabled:opacity-60">
              {t("resume.resend")}
            </button>
          )}
        </p>
      </form>
    </Modal>
  );
}
