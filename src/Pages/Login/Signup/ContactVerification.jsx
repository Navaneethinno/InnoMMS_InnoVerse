import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, ShieldCheck } from "lucide-react";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { maskDestination } from "@/Hooks/Onboarding/useContactVerification";
import { OTP_CONFIG } from "@/Utils/Constant";
import { cn } from "@/Utils/Lib/utils";
import { fieldControl } from "./OnboardingField";

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Email / phone input with its own verification (as in the customer
// portal): a "Verify" chip while it has an unverified value, a green
// "Verified" tick (and read-only input) once confirmed, and an "Edit" link
// that unlocks it again.
export function VerifiableField({ channel, label, icon: Icon, type, value, onChange, placeholder, verification }) {
  const { t } = useTranslation("signup");
  const hasValue = Boolean(value?.trim());
  const verified = verification.isVerified(channel, value);
  const sending = verification.sendingFor === channel;
  const error = verification.fieldError[channel];
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon size={13} /> {label}
      </label>
      <div className="relative">
        <input
          type={type}
          className={cn(
            fieldControl,
            hasValue && "pr-28",
            verified && "!border-emerald-500 bg-emerald-50/40 focus:!ring-emerald-500/15 dark:bg-emerald-500/10",
          )}
          value={value}
          readOnly={verified}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} strokeWidth={3} /> {t("verified")}
            </span>
          ) : hasValue ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => void verification.startVerify(channel, value)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary-light disabled:opacity-60"
            >
              {sending && <Spinner size={11} />} {sending ? t("sending") : t("verify")}
            </button>
          ) : null}
        </span>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      {verified && (
        <button
          type="button"
          onClick={() => verification.unlock(channel)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Pencil size={12} /> {t("edit")}
        </button>
      )}
    </div>
  );
}

// One box per digit: typing moves on, Backspace moves back, arrows move
// between boxes, and pasting a code fills every box.
function OtpInput({ length, value, onChange, disabled, invalid, label }) {
  const boxes = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");
  const focusBox = (index) => boxes.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  const setFrom = (index, text) => {
    const clean = text.replace(/\D/g, "");
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < length; i += 1) next[index + i] = clean[i];
    onChange(next.join("").slice(0, length));
    focusBox(index + clean.length);
  };
  const handleKey = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) next[index] = "";
      else if (index > 0) {
        next[index - 1] = "";
        focusBox(index - 1);
      }
      onChange(next.join(""));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };
  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2.5 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => (boxes.current[index] = node)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`${label} ${index + 1}`}
          autoFocus={index === 0}
          disabled={disabled}
          value={digit}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setFrom(index, e.target.value.slice(-1))}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(index, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => handleKey(index, e)}
          className={cn(
            "h-14 w-12 rounded-xl border bg-background text-center text-xl font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 sm:h-16 sm:w-14 sm:text-2xl",
            digit ? "border-primary/50 bg-primary-light" : "border-border",
            invalid && "border-red-400 focus:border-red-400",
            disabled && "opacity-70",
          )}
        />
      ))}
    </div>
  );
}

// Code popup for whichever field asked for it.
export function OtpModal({ verification }) {
  const { t } = useTranslation("signup");
  const { modal, code, setCode, verifying, error, secondsLeft, sendingFor, resend, confirm, close } = verification;
  const isEmail = modal?.channel === "email";
  return (
    <Modal
      open={Boolean(modal)}
      onClose={close}
      size="sm"
      title={isEmail ? t("otpEyebrowEmail") : t("otpEyebrowPhone")}
      icon={<ShieldCheck size={18} />}
    >
      {modal && (
        <form
          className="text-center"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <h3 className="text-xl font-semibold text-foreground">{isEmail ? t("otpTitleEmail") : t("otpTitlePhone")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("otpSentTo", { length: OTP_CONFIG.length })}{" "}
            <span className="font-semibold text-foreground">{maskDestination(modal)}</span>
          </p>
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6">
            <OtpInput length={OTP_CONFIG.length} value={code} onChange={setCode} disabled={verifying} invalid={Boolean(error)} label={t("otpDigit")} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {secondsLeft > 0 ? (
              t("otpResendIn", { time: formatTime(secondsLeft) })
            ) : (
              <button
                type="button"
                disabled={Boolean(sendingFor)}
                onClick={() => void resend()}
                className="font-semibold text-primary hover:underline disabled:opacity-60"
              >
                {sendingFor ? t("sending") : t("otpResend")}
              </button>
            )}
          </p>
          <button
            type="submit"
            disabled={verifying || code.length !== OTP_CONFIG.length}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying && <Spinner size={14} />} {t("verify")}
          </button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={14} /> {t("otpExpires", { minutes: OTP_CONFIG.expiresMinutes })}
          </p>
        </form>
      )}
    </Modal>
  );
}
