import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  Moon,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { notifications } from "@/Utils/Lib/notifications";

const STEPS = [
  { id: "business", titleKey: "step1Title", hintKey: "step1Hint", icon: Building2 },
  { id: "contact", titleKey: "step2Title", hintKey: "step2Hint", icon: User },
  { id: "secure", titleKey: "step3Title", hintKey: "step3Hint", icon: ShieldCheck },
];

const EMPTY = {
  username: "",
  businessName: "",
  regNumber: "",
  contactName: "",
  email: "",
  phone: "",
  password: "",
  confirm: "",
};

// Which fields each step owns — drives both rendering and per-step validation.
const STEP_FIELDS = [
  ["username", "businessName", "regNumber"],
  ["contactName", "email", "phone"],
  ["password", "confirm"],
];

const fadeStep = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.25, ease: "easeOut" },
};

// One text field styled to the InnoMMS form language (rounded-xl, border
// token, leading icon, focus ring). Password fields get a show/hide toggle.
function Field({
  icon: Icon,
  label,
  required,
  optional,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  autoComplete,
  reveal,
  onToggleReveal,
  revealLabel,
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
        {optional ? (
          <span className="text-[11px] font-medium text-muted-foreground">({optional})</span>
        ) : null}
      </div>
      <div className="relative">
        {Icon ? (
          <Icon
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`w-full rounded-xl border bg-background/70 py-3 pl-9 text-sm text-foreground caret-foreground outline-none transition focus:ring-4 focus:ring-primary/10 ${
            onToggleReveal ? "pr-10" : "pr-4"
          } ${error ? "border-red-400 focus:border-red-400" : "border-border focus:border-primary"}`}
        />
        {onToggleReveal ? (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={revealLabel}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary"
          >
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        ) : null}
      </div>
      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 text-xs font-medium text-red-600"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SignupPage() {
  const { t } = useTranslation("signup");
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();

  const [step, setStep] = useState(0);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  const setField = (key) => (val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Validate one field; returns an error message key result or "".
  const validateField = (key, all = values) => {
    const v = String(all[key] ?? "").trim();
    const requiredKeys = ["username", "businessName", "contactName", "email", "password", "confirm"];
    if (requiredKeys.includes(key) && !v) return t("required");
    if (key === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("emailInvalid");
    if (key === "password" && v && v.length < 8) return t("passwordShort");
    if (key === "confirm" && v && v !== all.password) return t("passwordMismatch");
    return "";
  };

  const validateStep = (index) => {
    const next = {};
    STEP_FIELDS[index].forEach((key) => {
      const msg = validateField(key);
      if (msg) next[key] = msg;
    });
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  };

  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    if (!validateStep(step)) return;
    if (isLast) return submit();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // A prior step counts as complete once its required fields all pass.
  const isStepComplete = (index) =>
    index < step && STEP_FIELDS[index].every((key) => !validateField(key));

  const submit = async () => {
    // Validate everything before the (stubbed) submit.
    const allErrors = {};
    Object.keys(EMPTY).forEach((key) => {
      const msg = validateField(key);
      if (msg) allErrors[key] = msg;
    });
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const firstBad = STEP_FIELDS.findIndex((keys) => keys.some((k) => allErrors[k]));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    setSubmitting(true);
    // TODO: wire to the backend registration endpoint. For now the flow is
    // UI-only — validate, then surface a "not connected yet" notice.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    notifications.info(t("notWiredBody"));
  };

  const activeStep = STEPS[step];

  const fields = useMemo(
    () => ({
      username: (
        <Field
          key="username"
          icon={User}
          label={t("username")}
          required
          value={values.username}
          onChange={setField("username")}
          onBlur={() => setErrors((p) => ({ ...p, username: validateField("username") || undefined }))}
          error={errors.username}
          placeholder={t("usernamePlaceholder")}
          autoComplete="username"
        />
      ),
      businessName: (
        <Field
          key="businessName"
          icon={Building2}
          label={t("businessName")}
          required
          value={values.businessName}
          onChange={setField("businessName")}
          onBlur={() =>
            setErrors((p) => ({ ...p, businessName: validateField("businessName") || undefined }))
          }
          error={errors.businessName}
          placeholder={t("businessNamePlaceholder")}
          autoComplete="organization"
        />
      ),
      regNumber: (
        <Field
          key="regNumber"
          icon={Info}
          label={t("regNumber")}
          optional={t("optional")}
          value={values.regNumber}
          onChange={setField("regNumber")}
          placeholder={t("regNumberPlaceholder")}
        />
      ),
      contactName: (
        <Field
          key="contactName"
          icon={User}
          label={t("contactName")}
          required
          value={values.contactName}
          onChange={setField("contactName")}
          onBlur={() =>
            setErrors((p) => ({ ...p, contactName: validateField("contactName") || undefined }))
          }
          error={errors.contactName}
          placeholder={t("contactNamePlaceholder")}
          autoComplete="name"
        />
      ),
      email: (
        <Field
          key="email"
          icon={Mail}
          label={t("email")}
          required
          type="email"
          value={values.email}
          onChange={setField("email")}
          onBlur={() => setErrors((p) => ({ ...p, email: validateField("email") || undefined }))}
          error={errors.email}
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
        />
      ),
      phone: (
        <Field
          key="phone"
          icon={Phone}
          label={t("phone")}
          optional={t("optional")}
          type="tel"
          value={values.phone}
          onChange={setField("phone")}
          placeholder={t("phonePlaceholder")}
          autoComplete="tel"
        />
      ),
      password: (
        <Field
          key="password"
          icon={Lock}
          label={t("password")}
          required
          type={showPw ? "text" : "password"}
          value={values.password}
          onChange={setField("password")}
          onBlur={() => setErrors((p) => ({ ...p, password: validateField("password") || undefined }))}
          error={errors.password}
          placeholder={t("passwordPlaceholder")}
          autoComplete="new-password"
          reveal={showPw}
          onToggleReveal={() => setShowPw((v) => !v)}
          revealLabel={showPw ? t("hidePassword") : t("showPassword")}
        />
      ),
      confirm: (
        <Field
          key="confirm"
          icon={Lock}
          label={t("confirmPassword")}
          required
          type={showConfirm ? "text" : "password"}
          value={values.confirm}
          onChange={setField("confirm")}
          onBlur={() => setErrors((p) => ({ ...p, confirm: validateField("confirm") || undefined }))}
          error={errors.confirm}
          placeholder={t("confirmPlaceholder")}
          autoComplete="new-password"
          reveal={showConfirm}
          onToggleReveal={() => setShowConfirm((v) => !v)}
          revealLabel={showConfirm ? t("hidePassword") : t("showPassword")}
        />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, errors, showPw, showConfirm, t],
  );

  return (
    <div className="relative min-h-screen bg-background">
      {/* Ambient tint so the card lifts off the page, matching the login mood. */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            mode === "dark"
              ? "radial-gradient(1200px 600px at 20% -10%, rgba(124,140,255,0.12), transparent 60%)"
              : "radial-gradient(1200px 600px at 20% -10%, rgba(124,140,255,0.14), transparent 60%)",
        }}
      />

      {/* Top bar. */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">InnoMMS</p>
            <p className="text-xs text-muted-foreground">{t("portalName")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageDropdown />
          <UiTooltip label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <button
              type="button"
              onClick={toggleMode}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-xl p-2.5 text-muted-foreground transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {mode === "dark" ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
            </button>
          </UiTooltip>
        </div>
      </header>

      {/* Card. */}
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="overflow-hidden rounded-[1.75rem] border shadow-[0_32px_90px_rgba(30,64,125,0.18),0_14px_28px_rgba(15,23,42,0.08)]"
          style={{
            background: "color-mix(in srgb, var(--card) 94%, transparent)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "var(--glass-border)",
          }}
        >
          <div className="grid gap-0 md:grid-cols-[300px_1fr]">
            {/* Left: vertical stepper. */}
            <aside className="border-b border-border/70 bg-muted/40 p-6 md:border-b-0 md:border-r">
              <p className="mb-4 text-sm font-bold text-foreground">{t("registrationSteps")}</p>
              <ol className="space-y-2">
                {STEPS.map((s, index) => {
                  const done = isStepComplete(index);
                  const current = index === step;
                  const Icon = s.icon;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => index < step && setStep(index)}
                        disabled={index > step}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          current
                            ? "bg-primary-light"
                            : index < step
                              ? "hover:bg-background/60"
                              : "opacity-60"
                        } ${index < step ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : current
                                ? "border-primary text-primary"
                                : "border-border text-muted-foreground"
                          }`}
                        >
                          {done ? <Check size={14} strokeWidth={3} /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`flex items-center gap-1.5 text-sm font-bold ${
                              current || index < step ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            <Icon size={13} /> {t(s.titleKey)}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {t(s.hintKey)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                <ShieldCheck size={13} className="text-primary" />
                {t("privacyNote")}
              </div>
            </aside>

            {/* Right: form for the active step. */}
            <section className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t("eyebrow")}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

              {/* Slim progress bar. */}
              <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-border">
                <motion.div
                  className="h-full rounded-full bg-brand-gradient"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {t("stepOf", { current: step + 1, total: STEPS.length })}
              </p>

              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                noValidate
              >
                <AnimatePresence mode="wait">
                  <motion.div key={activeStep.id} {...fadeStep} className="space-y-4">
                    {STEP_FIELDS[step].map((key) => fields[key])}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex items-center justify-between gap-3">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                      <ArrowLeft size={14} /> {t("back")}
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> {t("creating")}
                      </>
                    ) : isLast ? (
                      <>
                        <Check size={14} /> {t("createAccount")}
                      </>
                    ) : (
                      <>
                        {t("next")} <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                {t("haveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-semibold text-primary transition hover:text-primary/80"
                >
                  {t("signInLink")}
                </button>
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
