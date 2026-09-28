import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Moon, RefreshCw, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { apiMessage, notifications } from "../../Utils/Lib/notifications";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { UiTooltip } from "@/Components/Common/UiTooltip";

export function LoginPage() {
  const { t } = useTranslation("login");
  // Optional dev-only prefill: set VITE_DEFAULT_LOGIN_USERNAME /
  // VITE_DEFAULT_LOGIN_PASSWORD in a local (gitignored) .env. Never falls
  // back to a real credential in the source, so nothing ships in the bundle.
  const [username, setUsername] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_LOGIN_USERNAME || "" : "",
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_LOGIN_PASSWORD || "" : "",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);
  const { mode, toggleMode } = useColorMode();

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t("enterCredentials"));
      return;
    }
    setError("");
    setLoading(true);
    const result = await login({ username, password });
    setLoading(false);
    if (result.success) {
      notifications.success(apiMessage(result, "Signed in successfully"));
      navigate("/dashboard");
    } else {
      const msg = result.message || t("invalidCredentials");
      setError(msg);
      notifications.error(msg);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground caret-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar. */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">InnoMMS</p>
            <p className="text-xs text-muted-foreground">{t("merchantPortal")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageDropdown />
          <UiTooltip label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <button
              type="button"
              onClick={toggleMode}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mode === "dark" ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
            </button>
          </UiTooltip>
        </div>
      </header>

      {/* Body. */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Left hero. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="order-2 lg:order-1"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-primary shadow-sm">
            <ShieldCheck size={15} /> {t("secureBadge")}
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("heroDescription")}
          </p>
        </motion.div>

        {/* Right sign-in card. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          className="order-1 w-full justify-self-center lg:order-2 lg:justify-self-end"
        >
          <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_30px_80px_rgba(30,64,125,0.14),0_10px_24px_rgba(15,23,42,0.06)] sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("welcomeBack")}</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{t("signInTitle")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

            <form onSubmit={submit} noValidate className="mt-7 space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  {t("usernameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder={t("usernamePlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  {t("password")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder={t("passwordPlaceholder")}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="mt-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-xs font-semibold text-primary transition hover:text-primary/80"
                  >
                    {t("forgotPassword")}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error ? (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-xs text-red-600"
                  >
                    <AlertCircle size={12} />
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> {t("authenticating")}
                  </>
                ) : (
                  <>
                    {t("signIn")} <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="font-semibold text-primary transition hover:text-primary/80"
              >
                {t("getStarted")}
              </button>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
