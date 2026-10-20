import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import Button from "@/Components/Common/Button";
import ErrorState from "@/Components/Common/ErrorState";
import Modal from "@/Components/Common/Modal";
import TextField from "@/Components/Common/TextField";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { usePolicy } from "@/Hooks/Auth/usePolicy";
import { setTransactionPin } from "@/Services/Auth/auth.api";
import { readAuthUser, updateAuthUser } from "@/Services/api/authStorage";
import { userUpdated } from "@/Redux/slices/authSlice";
import { notifications } from "@/Utils/Lib/notifications";
import { fitsPinRules, pinRuleText, sanitizePin } from "@/Utils/Lib/pinRules";

// A bank with two PINs: whether this merchant still has to create the PIN that
// confirms payments (their sign-in PIN does not).
export function useNeedsTransactionPin() {
  const user = useSelector((state) => state.auth.user);
  return Boolean(user?.separatePins) && user?.pinSet === false;
}

// "Create your transaction PIN": the sign-in PIN to prove it is them, then the
// new PIN twice (sent once). The new PIN must differ from the sign-in PIN; the
// API says so if it does not.
export function TransactionPinForm({ onDone }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const rules = usePinRules();
  const { signinPinRules } = usePolicy();
  const [v, setV] = useState({ signin: "", pin: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");

  const set = (key, keep) => (event) => {
    setV((previous) => ({ ...previous, [key]: sanitizePin(keep, event.target.value) }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };
  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (v.signin.length < Math.min(signinPinRules.minLength, 4)) next.signin = t("auth.pinPlaceholder", { defaultValue: "Enter your PIN" });
    if (!fitsPinRules(rules, v.pin)) next.pin = pinRuleText(t, rules);
    else if (v.pin !== v.confirm) next.confirm = t("auth.mismatch");
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setProblem("");
    try {
      const { message } = await setTransactionPin(v.signin, v.pin);
      updateAuthUser({ ...readAuthUser(), pinSet: true });
      dispatch(userUpdated({ pinSet: true }));
      if (message) notifications.success(message);
      onDone?.();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setPending(false);
    }
  };
  const box = (name, label, keep, error) => (
    <TextField name={name} type="password" label={label} maxLength={keep.maxLength} inputMode={keep.letters ? undefined : "numeric"} autoComplete="off" value={v[name]} error={error} onChange={set(name, keep)} />
  );
  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {problem && <ErrorState message={problem} />}
      {box("signin", t("security.signinPinNow", { defaultValue: "Your sign-in PIN" }), signinPinRules, errors.signin)}
      {box("pin", t("security.newTxnPin", { defaultValue: "New transaction PIN" }), rules, errors.pin)}
      {box("confirm", t("auth.confirmPin"), rules, errors.confirm)}
      <Button type="submit" pending={pending}>
        {t("security.createTxnPin", { defaultValue: "Create transaction PIN" })}
      </Button>
    </form>
  );
}

// The same form in a dialog (shown when the merchant signs in for the first time).
export function TransactionPinDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("security.createTxnPinTitle", { defaultValue: "Create your transaction PIN" })}
      description={t("security.createTxnPinHint", { defaultValue: "Your sign-in PIN only signs you in. Choose a different PIN to confirm payments." })}
    >
      <TransactionPinForm onDone={() => onOpenChange(false)} />
    </Modal>
  );
}

// A line above the pages that move money, while the transaction PIN is missing.
export function TransactionPinNotice() {
  const { t } = useTranslation();
  const needs = useNeedsTransactionPin();
  const [open, setOpen] = useState(false);
  if (!needs) return null;
  return (
    <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime/50 bg-lime/[0.16] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <KeyRound size={16} aria-hidden="true" className="shrink-0" />
        {t("security.needTxnPin", { defaultValue: "Create your transaction PIN to send money or use your cards." })}
      </p>
      <Button onClick={() => setOpen(true)}>{t("security.createTxnPin", { defaultValue: "Create transaction PIN" })}</Button>
      <TransactionPinDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
