import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  Layers,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  CircleHelp,
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
import Footer from "@/Components/Layout/Footer";
import { useLogin } from "@/Hooks/Auth/useLogin";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import { sanitizePin } from "@/Utils/Lib/pinRules";
import BrandLogo from "@/Components/Common/BrandLogo";
import { useBrandingLogo } from "@/Hooks/Branding/useBrandingLogo";
import { useBrandingLinks } from "@/Hooks/Branding/useBrandingLinks";
import { useBrandingLoginBackground } from "@/Hooks/Branding/useBrandingLoginBackground";

export default function Login() {
  const { t } = useTranslation();
  const logo = useBrandingLogo();
  const legal = useBrandingLinks();
  const background = useBrandingLoginBackground();
  const navigate = useNavigate();
  const policy = usePortalPolicy();
  const canPin = policy.login.methods.includes("PIN");
  const canPassword = policy.login.methods.includes("PASSWORD");
  // PIN or password: the portal's choice, or the customer's where both are allowed.
  const [chosen, setChosen] = useState(null);
  const signInWith = chosen ?? (canPin && policy.login.method === "PIN" ? "PIN" : "PASSWORD");
  const byPin = signInWith === "PIN" && canPin;
  const [values, setValues] = useState({ username: "", password: "", pin: "" });
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
    if (!values.username.trim()) next.username = "auth.usernameError";
    if (byPin) {
      // Older PINs are shorter than the rules for a new one, so only a PIN that is plainly too short is held back.
      if (values.pin.length < Math.min(policy.signinPinRules.minLength, 4)) next.pin = t("auth.pinPlaceholder", { defaultValue: "Enter your PIN" });
    } else if (!values.password) next.password = "auth.passwordError";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    const ok = await submit(byPin ? { username: values.username.trim(), pin: values.pin } : { username: values.username.trim(), password: values.password });
    if (!ok) {
      setSubmitting(false);
      return;
    }
    // Let the success state show briefly, then carry on as before.
    setSignedIn(true);
    window.setTimeout(() => navigate("/dashboard", { replace: true }), 700);
  };
  return (
    <div className="min-h-screen bg-paper min-[880px]:grid min-[880px]:h-screen min-[880px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] min-[880px]:overflow-hidden">
      {/* Brand panel: one hero message, vertically centred. */}
      <aside
        className="brand-gradient relative isolate hidden h-screen flex-col overflow-hidden px-10 py-9 text-white min-[880px]:flex xl:px-16"
        // The bank's own picture, under a wash of its colour so the text stays readable.
        style={
          background
            ? { backgroundImage: `linear-gradient(rgb(var(--color-primary) / 0.72), rgb(var(--color-primary) / 0.9)), url(${background})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-1/2 -z-10 h-[620px] w-[620px] -translate-y-1/2 rounded-full border border-white/[0.08]" />
        <div>
          <div className="flex items-center gap-3">
            {logo ? (
              <BrandLogo src={logo} size={46} tone="dark" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.16]">
                <Layers size={21} strokeWidth={1.8} />
              </span>
            )}
            <span className="font-display text-2xl font-medium tracking-tight">{t("brand.name")}</span>
          </div>
          <p className="mt-2 pl-[52px] text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
            {t("brand.portal")}
          </p>
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
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={15} className="shrink-0" />
          {t("auth.personalSpace")}
        </div>
      </aside>

      {/* Sign-in form, centred on the same axis as the hero. */}
      <div className="flex min-h-screen min-w-0 flex-col px-5 sm:px-10 min-[880px]:h-screen min-[880px]:min-h-0">
        <header className="flex items-center justify-between gap-3 py-5 min-[880px]:justify-end">
          <div className="min-[880px]:hidden">
            <Brand />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle />
            <ThemeToggle className="h-9 w-9 border-ink/20" />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-4">
          <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-ink">
            {t("auth.title")}
          </h1>
          <p className="mt-2 text-[14.5px] text-slate-500">{t("auth.description")}</p>
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
                    value={values.username}
                    disabled={pending}
                    error={errors.username ? t(errors.username) : undefined}
                    onChange={(value) => {
                      setValues((previous) => ({ ...previous, username: value }));
                      setErrors((previous) => ({ ...previous, username: null }));
                    }}
                  />
                ) : (
                  <TextField
                    name="username"
                    label={byPin ? t("onb.mobile") : t("auth.username")}
                    type="text"
                    icon={UserRound}
                    className="rounded-[11px]"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={byPin ? undefined : t("auth.usernamePlaceholder")}
                    value={values.username}
                    required
                    disabled={pending}
                    error={errors.username ? t(errors.username) : undefined}
                    onChange={(event) => {
                      setValues((previous) => ({ ...previous, username: event.target.value }));
                      setErrors((previous) => ({ ...previous, username: null }));
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
                    placeholder={t("auth.pinPlaceholder", { defaultValue: "Enter your PIN" })}
                    value={values.pin}
                    required
                    disabled={pending}
                    error={errors.pin}
                    onChange={(event) => {
                      setValues((previous) => ({ ...previous, pin: sanitizePin(policy.signinPinRules, event.target.value) }));
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
                    autoComplete="current-password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={values.password}
                    required
                    disabled={pending}
                    error={errors.password ? t(errors.password) : undefined}
                    onChange={(event) => {
                      setValues((previous) => ({ ...previous, password: event.target.value }));
                      setErrors((previous) => ({ ...previous, password: null }));
                    }}
                  />
                )}
              </>
            )}
            <div className="-mt-1 flex items-center justify-between gap-3">
              {canPin && canPassword ? (
                <button type="button" onClick={() => setChosen(byPin ? "PASSWORD" : "PIN")} className="rounded text-xs font-bold text-ink hover:underline">
                  {byPin ? t("auth.usePassword", { defaultValue: "Use your password instead" }) : t("auth.usePin", { defaultValue: "Use your PIN instead" })}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => navigate(byPin ? "/forgot-pin" : "/forgot-password")} className="rounded text-xs font-bold text-ink hover:underline">
                {byPin ? t("auth.forgotPin", { defaultValue: "Forgot PIN?" }) : t("auth.forgot")}
              </button>
            </div>
            <Button
              type="submit"
              animated
              disabled={policy.status === "loading" || paused}
              pending={(pending || submitting) && !signedIn}
              success={signedIn}
              successLabel={t("auth.signedIn")}
              aria-label={t(pending ? "auth.signingIn" : signedIn ? "auth.signedIn" : "auth.signIn")}
              className="w-full rounded-[11px] py-3.5 font-bold hover:bg-forest/85"
            >
              {t("auth.signIn")}
              <ArrowRight size={17} />
            </Button>
            <p className="text-center text-[11px] leading-5 text-slate-500">
              <Trans i18nKey="auth.terms" components={{ terms: <LegalLink href={legal.terms} fallback="/terms" />, privacy: <LegalLink href={legal.privacy} fallback="/privacy" /> }} />
            </p>
          </form>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <ShieldCheck size={14} className="shrink-0" />
            <span>{t("auth.privateSession")}</span>
          </div>
          {canPassword && (
            <p className="mt-4 text-center text-sm text-slate-500">
              {t("auth.firstTime")}{" "}
              <button type="button" onClick={() => navigate("/activate")} className="font-bold text-ink hover:underline">
                {t("auth.activateLink")}
              </button>
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
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
