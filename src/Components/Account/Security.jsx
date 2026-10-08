import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { KeyRound, LockKeyhole, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import Button from "@/Components/Common/Button";
import ConfirmDialog from "@/Components/Common/ConfirmDialog";
import ErrorState from "@/Components/Common/ErrorState";
import IconCard from "@/Components/Common/IconCard";
import OtpInput from "@/Components/Common/OtpInput";
import TextField from "@/Components/Common/TextField";
import { TransactionPinForm, useNeedsTransactionPin } from "./TransactionPinSetup";
import { useMeRefresh } from "@/Hooks/Auth/useMeRefresh";
import { changePassword, changePin, changeSigninPin, endSession, listSessions, resetPin, startPinReset } from "@/Services/Auth/auth.api";
import { useSignOut } from "@/Hooks/Auth/useSignOut";
import { formatDateTime } from "@/Utils/Lib/format";
import { notifications } from "@/Utils/Lib/notifications";
import { usePolicy } from "@/Hooks/Auth/usePolicy";
import { fitsPasswordRules, passwordRuleText } from "@/Utils/Lib/policy";
import { usePinRules } from "@/Hooks/Auth/usePinRules";
import { fitsPinRules, pinRuleText, sanitizePin } from "@/Utils/Lib/pinRules";

// The signed-in merchant's password and transaction PIN: change the
// password, change the PIN, or reset the PIN with a code (which also unlocks
// it). The PIN status comes from `auth/me`.

// Runs one action, shows the API's message on success and its refusal in red.
function useAction() {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState("");
  const run = async (action, onDone) => {
    setPending(true);
    setProblem("");
    try {
      const result = await action();
      if (result?.message) notifications.success(result.message);
      onDone?.(result);
      return true;
    } catch (error) {
      setProblem(error.message);
      return false;
    } finally {
      setPending(false);
    }
  };
  return { pending, problem, run };
}

// `passwordSet` false: the merchant signs in with a PIN and has never set a
// password, so the "current" box takes their PIN.
function PasswordCard({ onChanged }) {
  const { t } = useTranslation();
  const { password: rules } = usePolicy();
  const noPasswordYet = useSelector((state) => state.auth.user?.passwordSet) === false;
  const { pending, problem, run } = useAction();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const set = (key) => (event) => {
    setV((previous) => ({ ...previous, [key]: event.target.value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!v.current) next.current = noPasswordYet ? t("send.enterPin") : t("auth.passwordError");
    if (!fitsPasswordRules(rules, v.next)) next.next = passwordRuleText(t, rules);
    else if (v.next !== v.confirm) next.confirm = t("auth.mismatch");
    setErrors(next);
    if (Object.keys(next).length) return;
    void run(() => changePassword(v.current, v.next), () => {
      setV({ current: "", next: "", confirm: "" });
      onChanged?.();
    });
  };
  return (
    <IconCard icon={LockKeyhole} title={t("security.password")} hint={passwordRuleText(t, rules)}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        {noPasswordYet && <p className="text-xs leading-5 text-slate-500">{t("security.firstPassword", { defaultValue: "If you have not set a password yet, enter your PIN as the current password." })}</p>}
        <TextField name="current" type="password" label={noPasswordYet ? t("auth.currentPin") : t("auth.currentPassword")} autoComplete="new-password" value={v.current} error={errors.current} onChange={set("current")} />
        <TextField name="next" type="password" label={t("auth.newPassword")} autoComplete="new-password" value={v.next} error={errors.next} onChange={set("next")} />
        <TextField name="confirm" type="password" label={t("auth.confirmPassword")} autoComplete="new-password" value={v.confirm} error={errors.confirm} onChange={set("confirm")} />
        <Button type="submit" pending={pending}>
          {t("security.save")}
        </Button>
      </form>
    </IconCard>
  );
}


// `rules`, `change`, `title` and `hint` default to the transaction PIN's; the
// sign-in PIN of a two-PIN bank passes its own.
function ChangePinCard({ locked, onChanged, title, hint, rules: rulesFor, change = changePin }) {
  const { t } = useTranslation();
  const transactionRules = usePinRules();
  const rules = rulesFor ?? transactionRules;
  const { pending, problem, run } = useAction();
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const set = (key) => (event) => {
    setV((previous) => ({ ...previous, [key]: sanitizePin(rules, event.target.value) }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!v.current) next.current = t("auth.pinPlaceholder", { defaultValue: "Enter your PIN" });
    if (!fitsPinRules(rules, v.next)) next.next = pinRuleText(t, rules);
    else if (v.next !== v.confirm) next.confirm = t("auth.mismatch");
    setErrors(next);
    if (Object.keys(next).length) return;
    void run(() => change(v.current, v.next), () => {
      setV({ current: "", next: "", confirm: "" });
      onChanged();
    });
  };
  return (
    <IconCard icon={KeyRound} title={title ?? t("security.changePin")} hint={hint ?? (locked ? t("security.pinStatusLocked") : rules.known ? `${t("auth.pinHint")} ${pinRuleText(t, rules)}` : t("auth.pinHint"))}>
      <form noValidate onSubmit={submit} className="space-y-4">
        {problem && <ErrorState message={problem} />}
        <TextField name="current" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.currentPin")} autoComplete="off" disabled={locked} value={v.current} error={errors.current} onChange={set("current")} />
        <TextField name="next" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.newPin")} autoComplete="off" disabled={locked} value={v.next} error={errors.next} onChange={set("next")} />
        <TextField name="confirm" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.confirmPin")} autoComplete="off" disabled={locked} value={v.confirm} error={errors.confirm} onChange={set("confirm")} />
        <Button type="submit" pending={pending} disabled={locked}>
          {t("security.save")}
        </Button>
      </form>
    </IconCard>
  );
}

function ResetPinCard({ onChanged }) {
  const { t } = useTranslation();
  const rules = usePinRules();
  const { otp } = usePolicy();
  const { pending, problem, run } = useAction();
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState("");
  const [v, setV] = useState({ pin: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const ask = () => run(startPinReset, (reply) => {
    setSent(reply);
    setCode("");
  });
  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!fitsPinRules(rules, v.pin)) next.pin = pinRuleText(t, rules);
    else if (v.pin !== v.confirm) next.confirm = t("auth.mismatch");
    setErrors(next);
    if (Object.keys(next).length || code.length < otp.length) return;
    void run(() => resetPin({ otp_ref: sent.otp_ref, otp: code, pin: v.pin }), () => {
      setSent(null);
      setV({ pin: "", confirm: "" });
      onChanged();
    });
  };
  return (
    <IconCard icon={ShieldCheck} title={t("security.resetPin")} hint={t("security.resetPinHint")}>
      {problem && (
        <div className="mb-4">
          <ErrorState message={problem} />
        </div>
      )}
      {!sent ? (
        <Button pending={pending} onClick={() => void ask()}>
          {t("security.sendCode")}
        </Button>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <p className="rounded-xl bg-ink/5 p-3 text-sm text-slate-600">{t("auth.codeSent", { to: sent.sent_to ?? "" })}</p>
          <OtpInput length={otp.length} value={code} onChange={setCode} disabled={pending} label={t("auth.codeLabel")} />
          <TextField name="pin" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.newPin")} autoComplete="off" value={v.pin} error={errors.pin} onChange={(event) => setV((previous) => ({ ...previous, pin: sanitizePin(rules, event.target.value) }))} />
          <TextField name="confirm" type="password" maxLength={rules.maxLength} inputMode={rules.letters ? undefined : "numeric"} label={t("auth.confirmPin")} autoComplete="off" value={v.confirm} error={errors.confirm} onChange={(event) => setV((previous) => ({ ...previous, confirm: sanitizePin(rules, event.target.value) }))} />
          <Button type="submit" pending={pending} disabled={code.length < otp.length}>
            {t("security.resetPin")}
          </Button>
        </form>
      )}
    </IconCard>
  );
}

// Where the merchant is signed in: every open session, with a way to end the
// others, and to sign out of every device at once.
function SessionsCard() {
  const { t } = useTranslation();
  const signOut = useSignOut();
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [busy, setBusy] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [endingAll, setEndingAll] = useState(false);
  const load = useCallback(() => {
    listSessions()
      .then((items) => setState({ loading: false, items, error: "" }))
      .catch((error) => setState({ loading: false, items: [], error: error.message }));
  }, []);
  useEffect(() => load(), [load]);
  const end = async (session) => {
    setBusy(session.id);
    try {
      await endSession(session.id);
      load();
    } catch (error) {
      setState((previous) => ({ ...previous, error: error.message }));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="md:col-span-2 xl:col-span-3">
      <IconCard icon={MonitorSmartphone} title={t("sessions.title")} hint={t("sessions.hint")}>
        {state.error && (
          <div className="mb-4">
            <ErrorState message={state.error} />
          </div>
        )}
        {state.loading ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200/60" />
        ) : (
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto pr-1">
            {state.items.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                  <MonitorSmartphone size={16} />
                </span>
                <span className="min-w-[12rem] flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                    {t(session.channel === "APP" ? "sessions.app" : "sessions.web")}
                    {session.current && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t("sessions.current")}</span>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {t("sessions.signedIn", { when: formatDateTime(session.signed_in_at) })} · {t("sessions.lastActive", { when: formatDateTime(session.last_seen_at) })}
                  </span>
                </span>
                {!session.current && (
                  <Button variant="secondary" pending={busy === session.id} onClick={() => void end(session)} className="px-3 py-2">
                    {t("common.signOut")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setConfirmAll(true)}>
            {t("security.signOutAll")}
          </Button>
        </div>
      </IconCard>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("sessions.allTitle")}
        description={t("sessions.allDescription")}
        pending={endingAll}
        onConfirm={async () => {
          setEndingAll(true);
          await signOut({ all: true });
        }}
      />
    </div>
  );
}

export default function Security() {
  const { t } = useTranslation();
  // A portal that signs in with a PIN has no password to change.
  const policy = usePolicy();
  const passwordLogin = policy.login.methods.includes("PASSWORD");
  const user = useSelector((state) => state.auth.user);
  // A bank with two PINs: the sign-in PIN and the transaction PIN are separate.
  const separate = Boolean(user?.separatePins);
  const needsTxnPin = useNeedsTransactionPin();

  // The PIN status (set / locked) comes from `auth/me`.
  const refreshStatus = useMeRefresh();
  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const status = user?.pinLocked ? t("security.pinStatusLocked") : user?.pinSet === false ? t("security.pinStatusNone") : t("security.pinStatusSet");
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">{t("security.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("security.subtitle")}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink">
          <KeyRound size={13} />
          {status}
        </p>
      </div>
      {/* Three across only when there are three or more cards: two fill the row. */}
      <div className={cn("grid grid-cols-1 gap-5 md:grid-cols-2", (passwordLogin || separate) && "xl:grid-cols-3")}>
        {passwordLogin && <PasswordCard onChanged={refreshStatus} />}
        {separate && (
          <ChangePinCard
            title={t("security.changeSigninPin", { defaultValue: "Change sign-in PIN" })}
            hint={t("security.signinPinHint", { defaultValue: "This is the PIN you sign in with. Changing it signs you out on your other devices." })}
            rules={policy.signinPinRules}
            change={changeSigninPin}
            onChanged={refreshStatus}
          />
        )}
        {needsTxnPin ? (
          <IconCard icon={KeyRound} title={t("security.createTxnPinTitle", { defaultValue: "Create your transaction PIN" })} hint={t("security.createTxnPinHint", { defaultValue: "Your sign-in PIN only signs you in. Choose a different PIN to confirm payments." })}>
            <TransactionPinForm onDone={() => void refreshStatus()} />
          </IconCard>
        ) : (
          <ChangePinCard title={separate ? t("security.changeTxnPin", { defaultValue: "Change transaction PIN" }) : undefined} locked={Boolean(user?.pinLocked)} onChanged={refreshStatus} />
        )}
        <ResetPinCard onChanged={refreshStatus} />
        <SessionsCard />
      </div>
    </div>
  );
}
