import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import OtpInput from "@/Components/Common/OtpInput";
import PhoneField from "@/Components/Common/PhoneField";
import TextField from "@/Components/Common/TextField";
import { notifications } from "@/Utils/Lib/notifications";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { fitsPasswordRules, passwordRuleText } from "@/Utils/Lib/policy";
import { fitsPinRules, pinRuleText, sanitizePin } from "@/Utils/Lib/pinRules";

// The two-step "code, then new secrets" flow shared by activating access and
// resetting a password:
//   1. the merchant gives their email or mobile number and gets a 6-digit
//      code (the API answers the same whether or not they are registered);
//   2. they enter the code and choose the new password (and, when
//      activating, the transaction PIN), each typed twice.
//
// `askCode(loginId)` resolves to { otp_ref, sent_to }; `submit({ otp_ref,
// otp, password, pin? })` finishes it; `withPin` adds the PIN fields.

// `withPassword` false is for a PIN reset (no password involved); `loginAsPhone`
// takes the login as a number with the institution's prefix; `pinLabel` names
// the PIN box.
export default function CodeFlow({ askCode, submit, withPin = false, withPassword = true, loginAsPhone = false, pinLabel, submitLabel, onDone }) {
  const { t } = useTranslation();
  const [loginId, setLoginId] = useState("");
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState("");
  const [values, setValues] = useState({ password: "", confirm: "", pin: "", pinConfirm: "" });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  // The rules for the PIN being set, once the code (which names the account) is sent.
  const policy = usePortalPolicy(sent?.otp_ref);
  // Signing in by phone (forgot PIN) sets the sign-in PIN; otherwise it is the transaction PIN being set.
  const rules = loginAsPhone ? policy.signinPinRules : policy.pinRules;
  const CODE_LENGTH = policy.otp.length;

  const set = (key) => (event) => {
    setValues((previous) => ({ ...previous, [key]: event.target.value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const requestCode = async (event) => {
    event.preventDefault();
    if (!loginId.trim()) return setErrors({ loginId: t("auth.usernameError") });
    setPending(true);
    setProblem("");
    try {
      setSent(await askCode(loginId.trim()));
      setCode("");
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };

  const finish = async (event) => {
    event.preventDefault();
    const next = {};
    if (withPassword) {
      if (!fitsPasswordRules(policy.password, values.password)) next.password = passwordRuleText(t, policy.password);
      else if (values.password !== values.confirm) next.confirm = t("auth.mismatch");
    }
    if (withPin) {
      if (!fitsPinRules(rules, values.pin)) next.pin = pinRuleText(t, rules);
      else if (withPassword && !rules.mayEqualPassword && values.pin === values.password) next.pin = t("pin.sameAsPassword");
      else if (values.pin !== values.pinConfirm) next.pinConfirm = t("auth.mismatch");
    }
    setErrors(next);
    if (Object.keys(next).length || code.length < CODE_LENGTH) return;
    setPending(true);
    setProblem("");
    try {
      const { message } = await submit({ otp_ref: sent.otp_ref, otp: code, ...(withPassword ? { password: values.password } : {}), ...(withPin ? { pin: values.pin } : {}) });
      if (message) notifications.success(message);
      onDone();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} />
        </div>
      )}
      {!sent ? (
        <form noValidate onSubmit={requestCode} className="space-y-4">
          {loginAsPhone && policy.phone.countries.length ? (
            <PhoneField name="login_id" label={t("onb.mobile")} countries={policy.phone.countries} allowOther value={loginId} error={errors.loginId} onChange={(value) => { setLoginId(value); setErrors({}); }} />
          ) : (
            <TextField
              name="login_id"
              label={loginAsPhone ? t("onb.mobile") : t("auth.username")}
              icon={UserRound}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={loginAsPhone ? undefined : t("auth.usernamePlaceholder")}
              value={loginId}
              error={errors.loginId}
              onChange={(event) => {
                setLoginId(event.target.value);
                setErrors({});
              }}
            />
          )}
          <Button type="submit" pending={pending} className="w-full">
            {t("auth.sendCode")}
          </Button>
        </form>
      ) : (
        <form noValidate onSubmit={finish} className="space-y-4">
          <p className="rounded-xl bg-ink/5 p-3 text-sm leading-6 text-slate-600">{t("auth.codeSent", { to: sent.sent_to ?? loginId })}</p>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">{t("auth.codeLabel")}</p>
            <OtpInput length={CODE_LENGTH} value={code} onChange={setCode} disabled={pending} label={t("auth.codeLabel")} />
          </div>
          {withPassword && (
            <>
              <TextField name="password" type="password" label={t("auth.newPassword")} autoComplete="new-password" value={values.password} error={errors.password} onChange={set("password")} />
              <TextField name="confirm" type="password" label={t("auth.confirmPassword")} autoComplete="new-password" value={values.confirm} error={errors.confirm} onChange={set("confirm")} />
            </>
          )}
          {withPin && (
            <>
              <TextField name="pin" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={pinLabel ?? t("auth.pin")} autoComplete="off" value={values.pin} error={errors.pin} onChange={(event) => { setValues((previous) => ({ ...previous, pin: sanitizePin(rules, event.target.value) })); setErrors((previous) => ({ ...previous, pin: "" })); }} />
              <TextField name="pinConfirm" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.confirmPin")} autoComplete="off" value={values.pinConfirm} error={errors.pinConfirm} onChange={(event) => { setValues((previous) => ({ ...previous, pinConfirm: sanitizePin(rules, event.target.value) })); setErrors((previous) => ({ ...previous, pinConfirm: "" })); }} />
              <p className="text-xs leading-5 text-slate-400">{t("auth.pinHint")}</p>
            </>
          )}
          <Button type="submit" pending={pending} disabled={code.length < CODE_LENGTH} className="w-full">
            {submitLabel}
          </Button>
          <button type="button" onClick={requestCode} disabled={pending} className="mx-auto block text-xs font-semibold text-ink hover:underline disabled:opacity-50">
            {t("auth.sendCode")}
          </button>
        </form>
      )}
    </>
  );
}
