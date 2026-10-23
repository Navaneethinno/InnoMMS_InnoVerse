import { useNavigate } from "react-router-dom";
import { createElement, useState } from "react";
import {
  ArrowRight,
  ArrowDownLeft,
  CircleHelp,
  Info,
  Layers,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import Brand from "@/Components/Common/Brand";
import Button from "@/Components/Common/Button";
import PhoneField from "@/Components/Common/PhoneField";
import TextField from "@/Components/Common/TextField";
import ThemeToggle from "@/Components/Common/ThemeToggle";
import LanguageToggle from "@/Components/Common/LanguageToggle";
import Modal from "@/Components/Common/Modal";
import ErrorState from "@/Components/Common/ErrorState";
import LegalLink from "@/Components/Common/LegalLink";
import { useDocuments } from "@/Hooks/useDocuments";
import Footer from "@/Components/Layout/Footer";
import { useLogin } from "@/Hooks/Auth/useLogin";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import BrandLogo from "@/Components/Common/BrandLogo";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
import { useBrandingLinks } from "@/Hooks/Branding/useBrandingLinks";
import { useBrandingLoginBackground } from "@/Hooks/Branding/useBrandingLoginBackground";

const FEATURES = [
  [
    ArrowDownLeft,
    "auth.featurePay",
    "Take payments by QR, card and mobile money",
  ],
  [
    ReceiptText,
    "auth.featureBills",
    "Pay suppliers, bills, airtime and electricity",
  ],
  [
    Store,
    "auth.featureStores",
    "Run your stores, staff and agents in one place",
  ],
];

export default function Login() {
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  const legal = useBrandingLinks();
  const docs = useDocuments();
  // The institution's own published document, else its branding link, else the portal's page.
  const legalLink = (code, href, fallback) => (docs?.some((d) => d.code === code) ? { fallback: `/legal/${code}` } : { href, fallback });
  const background = useBrandingLoginBackground();
  const navigate = useNavigate();
  const policy = usePortalPolicy();
  const canPin = policy.login.methods.includes("PIN");
  const canPassword = policy.login.methods.includes("PASSWORD");
  // PIN or password: the portal's choice, or the merchant's where both are allowed.
  const [chosen, setChosen] = useState(null);
  const signInWith =
    chosen ?? (canPin && policy.login.method === "PIN" ? "PIN" : "PASSWORD");
  const byPin = signInWith === "PIN" && canPin;
  const [values, setValues] = useState(() => ({
    username: "",
    password: "",
    pin: "",
  }));
  const [capsLock, setCapsLock] = useState(false);
  const watchCaps = (event) =>
    setCapsLock(Boolean(event.getModifierState?.("CapsLock")));
  const [errors, setErrors] = useState({});
  const [dialog, setDialog] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  // Held from click until the request fails, so the button never flickers
  // back to idle between "request done" and "signed in".
  const [submitting, setSubmitting] = useState(false);
  const { submit, pending, error, paused } = useLogin();
  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!values.username.trim())
      next.username = byPin ? "auth.mobileError" : "auth.usernameError";
    if (byPin) {
      // Older PINs are shorter than the rules for a new one, so only a PIN that is plainly too short is held back.
      if (values.pin.length < Math.min(policy.signinPinRules.minLength, 4))
        next.pin = t("auth.pinPlaceholder", { defaultValue: "Enter your PIN" });
    } else if (!values.password) next.password = "auth.passwordError";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    const ok = await submit(
      byPin
        ? { username: values.username.trim(), pin: values.pin }
        : { username: values.username.trim(), password: values.password },
    );
    if (!ok) {
      setSubmitting(false);
      return;
    }
    // Let the success state show briefly, then carry on as before.
    setSignedIn(true);
    window.setTimeout(() => navigate("/dashboard", { replace: true }), 700);
  };
  return (
    <div className="min-h-screen bg-paper min-[880px]:grid min-[880px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel: one hero message, vertically centred. */}
      <aside
        className="brand-gradient login-hero sticky isolate top-0 hidden h-screen flex-col overflow-hidden px-10 py-9 text-white min-[880px]:flex xl:px-16"
        // The bank's own picture, under a wash of its colour so the text stays readable.
        style={
          background
            ? {
                backgroundImage: `linear-gradient(rgb(var(--color-primary) / 0.72), rgb(var(--color-primary) / 0.9)), url(${background})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-48 top-1/2 -z-10 h-[620px] w-[620px] -translate-y-1/2 rounded-full border border-white/[0.08]"
        />
        <div
          aria-hidden="true"
          className="login-glow pointer-events-none absolute -bottom-40 -start-24 -z-10 h-[460px] w-[460px] rounded-full bg-lime/25 blur-3xl dark:bg-lime/15"
        />
        <div
          aria-hidden="true"
          className="login-glow pointer-events-none absolute -top-32 end-10 -z-10 h-[320px] w-[320px] rounded-full bg-white/10 blur-3xl [animation-delay:-6s]"
        />
        <div>
          <div className="flex items-center gap-3">
            {logo ? (
              <BrandLogo src={logo} size={46} tone="dark" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.16]">
                <Layers size={21} strokeWidth={1.8} />
              </span>
            )}
            <div className="flex flex-col leading-none">
              <span className="font-display text-2xl font-medium tracking-tight">
                {t("brand.name")}
              </span>
              <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                {t("brand.portal")}
              </span>
            </div>
          </div>
        </div>
        <div className="my-auto max-w-[520px]">
          <div className="mb-6 flex items-center gap-3 text-[11px] font-semibold tracking-[0.2em] text-white/80">
            <span aria-hidden="true" className="h-px w-8 bg-white/60" />
            {t("auth.welcomeBadge")}
          </div>
          <h2 className="font-display text-5xl font-medium leading-[1.08] tracking-tight xl:text-6xl">
            {t("auth.heroFirst")}
            <br />
            {t("auth.heroAccent")}
          </h2>
          <p className="mt-6 max-w-[38ch] text-base leading-7 text-white/[0.72]">
            {t("auth.heroDescription")}
          </p>
          <ul className="login-features stagger mt-9 space-y-3.5">
            {FEATURES.map(([icon, key, fallback]) => (
              <li
                key={key}
                className="flex items-center gap-3 text-[15px] text-white/85"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.12] ring-1 ring-white/15">
                  {createElement(icon, { size: 17 })}
                </span>
                {t(key, { defaultValue: fallback })}
              </li>
            ))}
          </ul>
          {/* A glimpse of the portal: an illustration, not real figures. */}
          <div
            aria-hidden="true"
            className="login-float mt-10 hidden w-[300px] rounded-2xl bg-white/[0.1] p-4 ring-1 ring-white/20 backdrop-blur-md login-preview"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-white/60">
              <span className="flex items-center gap-1.5">
                <Wallet size={13} />
                {t("auth.previewWallet", { defaultValue: "Business wallet" })}
              </span>
              <span>MZN</span>
            </div>
            <p className="mt-2 font-display text-2xl tracking-wide">
              MZN ••••••
            </p>
            <div className="mt-3 space-y-2 border-t border-white/15 pt-3 text-xs text-white/75">
              {[
                ["auth.previewQr", "QR payment received", "+"],
                ["auth.previewAirtime", "Airtime sold", "+"],
                ["auth.previewSupplier", "Supplier paid", "−"],
              ].map(([key, fallback, sign]) => (
                <p
                  key={key}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{t(key, { defaultValue: fallback })}</span>
                  <span
                    className={
                      sign === "+"
                        ? "font-bold text-lime"
                        : "font-bold text-white/70"
                    }
                  >
                    {sign} ••••
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={15} className="shrink-0" />
          {t("auth.personalSpace")}
        </div>
      </aside>

      {/* Sign-in form, centred on the same axis as the hero. */}
      <div className="flex min-h-screen min-w-0 flex-col px-5 sm:px-10">
        <header className="flex items-center justify-between gap-3 py-5 min-[880px]:justify-end">
          <div className="min-w-0 [&_span:last-child]:whitespace-nowrap [&_span:last-child]:text-base sm:[&_span:last-child]:text-xl min-[880px]:hidden">
            <Brand />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle className="w-[104px] sm:w-[130px] [&_button]:px-3 sm:[&_button]:px-4" />
            <ThemeToggle className="h-9 w-9 border-ink/20" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-4">
          <div className="page-enter sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-surface sm:p-8 sm:shadow-[0_20px_50px_-24px_rgb(15_23_42/0.25)] dark:sm:border-white/10 dark:sm:shadow-none">
            <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-ink">
              {t("auth.title")}
            </h1>
            <p className="mt-2 text-[14.5px] text-slate-500">
              {t("auth.description")}
            </p>
            {/* One sign-in for everyone in this portal: merchants, agents and
              super agents, and store managers and cashiers. */}
            <p className="mt-3 inline-flex flex-wrap gap-1.5">
              {[
                ["auth.whoMerchant", "Merchants"],
                ["auth.whoAgent", "Agents"],
                ["auth.whoStaff", "Store staff"],
              ].map(([key, fallback]) => (
                <span
                  key={key}
                  className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink/70"
                >
                  {t(key, { defaultValue: fallback })}
                </span>
              ))}
            </p>
            {error && (
              <div className="mt-4">
                <ErrorState message={error.message} />
              </div>
            )}
            <form
              noValidate
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
              aria-label={t("auth.formLabel")}
            >
              {policy.status === "loading" ? (
                <div className="space-y-4" aria-hidden="true">
                  <div className="h-[74px] animate-pulse rounded-[11px] bg-slate-200/60" />
                  <div className="h-[74px] animate-pulse rounded-[11px] bg-slate-200/60" />
                </div>
              ) : (
                <>
                  {byPin && policy.phone.countries.length ? (
                    <PhoneField
                      name="username"
                      label={t("onb.mobile")}
                      countries={policy.phone.countries}
                      allowOther
                      autoComplete="off"
                      placeholder={t("auth.mobilePlaceholder", {
                        defaultValue: "Your mobile number",
                      })}
                      value={values.username}
                      disabled={pending}
                      error={errors.username ? t(errors.username) : undefined}
                      onChange={(value) => {
                        setValues((previous) => ({
                          ...previous,
                          username: value,
                        }));
                        setErrors((previous) => ({
                          ...previous,
                          username: null,
                        }));
                      }}
                    />
                  ) : (
                    <TextField
                      name="username"
                      label={byPin ? t("onb.mobile") : t("auth.username")}
                      type="text"
                      icon={UserRound}
                      className="rounded-[11px]"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={
                        byPin ? undefined : t("auth.usernamePlaceholder")
                      }
                      value={values.username}
                      required
                      disabled={pending}
                      error={errors.username ? t(errors.username) : undefined}
                      onChange={(event) => {
                        setValues((previous) => ({
                          ...previous,
                          username: event.target.value,
                        }));
                        setErrors((previous) => ({
                          ...previous,
                          username: null,
                        }));
                      }}
                    />
                  )}
                  {byPin ? (
                    <TextField
                      name="pin"
                      label={t("onb.pin")}
                      type="password"
                      inputMode="numeric"
                      icon={LockKeyhole}
                      className="rounded-[11px]"
                      maxLength={policy.signinPinRules.maxLength}
                      autoComplete="off"
                      placeholder={t("auth.pinPlaceholder", {
                        defaultValue: "Enter your PIN",
                      })}
                      value={values.pin}
                      required
                      disabled={pending}
                      error={errors.pin}
                      onChange={(event) => {
                        setValues((previous) => ({
                          ...previous,
                          pin: sanitizePin(
                            policy.signinPinRules,
                            event.target.value,
                          ),
                        }));
                        setErrors((previous) => ({ ...previous, pin: null }));
                      }}
                    />
                  ) : (
                    <TextField
                      name="password"
                      label={t("auth.password")}
                      type="password"
                      icon={LockKeyhole}
                      className="rounded-[11px]"
                      autoComplete="off"
                      placeholder={t("auth.passwordPlaceholder")}
                      value={values.password}
                      onKeyDown={watchCaps}
                      onKeyUp={watchCaps}
                      onBlur={() => setCapsLock(false)}
                      required
                      disabled={pending}
                      error={errors.password ? t(errors.password) : undefined}
                      onChange={(event) => {
                        setValues((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }));
                        setErrors((previous) => ({
                          ...previous,
                          password: null,
                        }));
                      }}
                    />
                  )}
                  {!byPin && capsLock && (
                    <p
                      role="status"
                      className="-mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
                    >
                      <Info size={13} />
                      {t("auth.capsLock", { defaultValue: "Caps Lock is on" })}
                    </p>
                  )}
                </>
              )}
              <div className="-mt-1 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(byPin ? "/forgot-pin" : "/forgot-password")
                  }
                  className="rounded text-xs font-bold text-ink hover:underline"
                >
                  {byPin
                    ? t("auth.forgotPin", { defaultValue: "Forgot PIN?" })
                    : t("auth.forgot")}
                </button>
              </div>

              <Button
                type="submit"
                animated
                disabled={policy.status === "loading" || paused}
                pending={(pending || submitting) && !signedIn}
                success={signedIn}
                successLabel={t("auth.signedIn")}
                aria-label={t(
                  pending
                    ? "auth.signingIn"
                    : signedIn
                      ? "auth.signedIn"
                      : "auth.signIn",
                )}
                className="w-full rounded-[11px] py-3.5 font-bold hover:bg-forest/85"
              >
                {t("auth.signIn")}
                <ArrowRight size={17} />
              </Button>
              {canPin && canPassword && (
                <button
                  type="button"
                  onClick={() => setChosen(byPin ? "PASSWORD" : "PIN")}
                  className="w-full rounded-[11px] border border-slate-200 py-3 text-sm font-bold text-ink transition hover:border-ink/40 hover:bg-ink/[0.03] dark:border-white/15"
                >
                  {byPin
                    ? t("auth.usePassword", {
                        defaultValue: "Use your password instead",
                      })
                    : t("auth.usePin", {
                        defaultValue: "Use your PIN instead",
                      })}
                </button>
              )}
              {byPin && (
                <p className="flex gap-2 rounded-xl bg-ink/[0.04] px-3 py-2.5 text-[11.5px] leading-4 text-slate-500 dark:bg-white/[0.04]">
                  <Info size={14} className="mt-px shrink-0" />
                  {t("auth.staffPinHint", {
                    defaultValue:
                      "Store manager or cashier? Your store's owner resets your PIN.",
                  })}
                </p>
              )}
            </form>
            {canPassword && (
              <p className="mt-4 text-center text-sm text-slate-500">
                {t("auth.firstTime")}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/activate")}
                  className="font-bold text-ink hover:underline"
                >
                  {t("auth.activateLink")}
                </button>
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                {t("auth.newHere")}
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="rounded-full border border-ink/25 px-3.5 py-1 font-semibold text-ink transition hover:border-ink hover:bg-ink/5"
                >
                  {t("auth.getStarted")}
                </button>
              </p>
              <button
                type="button"
                onClick={() => setDialog("help")}
                className="inline-flex items-center gap-1.5 rounded text-sm text-slate-500 hover:text-ink"
              >
                <CircleHelp size={15} />
                {t("auth.help")}
              </button>
            </div>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">
            <Trans
              i18nKey="auth.terms"
              components={{
                terms: <LegalLink {...legalLink("TERMS", legal.terms, "/terms")} />,
                privacy: <LegalLink {...legalLink("PRIVACY", legal.privacy, "/privacy")} />,
              }}
            />
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <ShieldCheck size={13} className="shrink-0" />
            {t("auth.privateSession")}
          </p>
        </main>
        <Footer className="py-4" />
      </div>
      <Modal
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={t(`auth.${dialog || "help"}Title`)}
        description={t(`auth.${dialog || "help"}Description`)}
      >
        <Button className="w-full" onClick={() => setDialog(null)}>
          {t("common.gotIt")}
        </Button>
      </Modal>
    </div>
  );
}
