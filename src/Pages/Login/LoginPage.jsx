import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { apiMessage, notifications } from "../../Utils/Lib/notifications";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { UiTooltip } from "@/Components/Common/UiTooltip";

const cardStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.12 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

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

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Top-right controls. */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
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

      {/* Left hero panel — gradient wash, brand heading, quote card. Hidden
          on small screens where the form takes the full width. */}
      <div
        className="relative hidden w-[52%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-[6vw]"
        style={{
          background:
            mode === "dark"
              ? "radial-gradient(900px 600px at 30% 20%, rgba(76,134,244,0.22), transparent 60%), linear-gradient(160deg, #0b1220, #101a2e)"
              : "radial-gradient(900px 600px at 30% 20%, rgba(34,102,238,0.18), transparent 60%), linear-gradient(160deg, #eaf1ff, #e3ebfb)",
        }}
      >
        {/* Ambient blobs. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-28 right-0 h-[360px] w-[360px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #7FE0C2, transparent 70%)" }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
        </div>

        <motion.div variants={cardStagger} initial="hidden" animate="visible" className="relative z-10 max-w-lg">
          <motion.div variants={cardItem} className="mb-8 flex items-center gap-3">
            <Logo size="md" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">InnoMMS</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("tagline")}</p>
            </div>
          </motion.div>

          <motion.p
            variants={cardItem}
            className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-primary"
          >
            {t("heroBadge")}
          </motion.p>
          <motion.h1 variants={cardItem} className="text-4xl font-bold leading-tight text-foreground">
            {t("heroFirst")}
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">{t("heroAccent")}</span>
          </motion.h1>
          <motion.p variants={cardItem} className="mt-4 max-w-md text-sm text-muted-foreground">
            {t("heroDescription")}
          </motion.p>

          <motion.div
            variants={cardItem}
            className="mt-8 max-w-md rounded-2xl border p-5"
            style={{
              background: "color-mix(in srgb, var(--card) 70%, transparent)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
                <ShieldCheck size={16} />
              </span>
              <p className="text-sm font-bold text-foreground">{t("cardTitle")}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("cardDescription")}</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right form panel. */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-24 sm:px-12 lg:flex-1 lg:px-[5vw] lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Compact brand row for small screens (hero panel is hidden there). */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size="md" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">InnoMMS</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("tagline")}</p>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("formLabel")}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{t("welcomeBack")}</h2>
          <p className="mb-7 mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("username")}</label>
              <div className="relative">
                <Mail
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t("password")}</label>
              <div className="relative">
                <Lock
                  size={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-10 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="-mt-1 text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-semibold text-primary transition hover:text-primary/80"
              >
                {t("forgotPassword")}
              </button>
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
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> {t("authenticating")}
                </>
              ) : (
                <>
                  <Fingerprint size={14} /> {t("signInSecurely")}
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("noAccount")}{" "}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold text-primary transition hover:text-primary/80"
            >
              {t("getStarted")}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
