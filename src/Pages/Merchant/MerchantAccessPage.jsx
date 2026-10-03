import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { merchantAccountApi, merchantSession } from "@/Services/Merchant/merchantAccount.api";
import { motion } from "motion/react";
import { ArrowLeft, KeyRound, Moon, ShieldCheck, Sun } from "lucide-react";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";
import merchantDashboardBg from "@/assets/merchant-dashboard-bg.png";
import merchantDashboardDarkBg from "@/assets/merchant-dashboard-night-bg.png";

const input =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const button =
  "rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50";
const validPin = (value) =>
  /^\d{4,6}$/.test(value) &&
  !/^(\d)\1+$/.test(value) &&
  ![
    "1234",
    "2345",
    "3456",
    "4567",
    "5678",
    "6789",
    "9876",
    "8765",
    "7654",
    "6543",
    "5432",
    "4321",
  ].includes(value);

export function MerchantAccessPage({ mode = "activate" }) {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [otpRef, setOtpRef] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = mode === "reset";
  const { mode: colorMode, toggleMode } = useColorMode();
  const { displayName, loginBackgroundUrl } = useBrandTheme();
  const work = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const requestCode = () =>
    work(async () => {
      const result = await merchantAccountApi.otp(
        loginId.trim(),
        reset ? "RESET_PASSWORD" : "ACTIVATE",
      );
      setOtpRef(result.data?.otp_ref ?? "");
      setMessage(result.message || `Code sent to ${result.data?.sent_to || loginId}`);
    });
  const submit = (event) => {
    event.preventDefault();
    void work(async () => {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password))
        throw new Error("Password must be 8–64 characters and contain a letter and a digit.");
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the six-digit code.");
      if (!reset && !validPin(pin))
        throw new Error("PIN must be 4–6 digits and cannot repeat or run in sequence.");
      const result = reset
        ? await merchantAccountApi.passwordReset({ otp_ref: otpRef, otp, password })
        : await merchantAccountApi.activate({ otp_ref: otpRef, otp, password, pin });
      if (reset) merchantSession.clear();
      setMessage(
        result.message ||
          (reset ? "Password reset. Sign in again." : "Access activated. Sign in now."),
      );
      window.setTimeout(() => navigate("/login"), 1200);
    });
  };
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      {loginBackgroundUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${loginBackgroundUrl})`,
          }}
        />
      ) : (
        <>
          <div
            aria-hidden="true"
            className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
              colorMode === "dark" ? "opacity-0" : "opacity-100"
            }`}
            style={{
              backgroundImage: `url(${merchantDashboardBg})`,
            }}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
              colorMode === "dark" ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(${merchantDashboardDarkBg})`,
            }}
          />
        </>
      )}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <p className="text-sm font-bold text-foreground">{displayName ?? "InnoMMS"}</p>
            <p className="text-xs text-muted-foreground">Merchant Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageDropdown />
          <button
            type="button"
            onClick={toggleMode}
            aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            {colorMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-2 lg:order-1"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-primary shadow-sm">
            <ShieldCheck size={15} /> Secure merchant workspace
          </span>
          <h2 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            {reset ? "Get back to your business." : "Your business starts here."}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            {reset
              ? "Set a new password and return to your merchant workspace."
              : "Set up secure access to your approved merchant account."}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-1 w-full max-w-md justify-self-center space-y-5 rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_30px_80px_rgba(30,64,125,0.14),0_10px_24px_rgba(15,23,42,0.06)] sm:p-9 lg:order-2 lg:justify-self-end"
        >
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <KeyRound size={13} />
              Merchant portal
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {reset ? "Reset password" : "Activate your access"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {reset
                ? "Request a code to set a new password."
                : "Approved merchants can activate with their registered email or phone."}
            </p>
          </div>
          {message && (
            <p role="status" className="rounded-xl bg-primary-light p-3 text-sm">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1 text-sm">
              Email or mobile number
              <input
                className={input}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
              />
            </label>
            <button
              type="button"
              className={button}
              disabled={busy || !loginId.trim()}
              onClick={requestCode}
            >
              {otpRef ? "Resend code" : "Send code"}
            </button>
            {otpRef && (
              <>
                <label className="block space-y-1 text-sm">
                  Six-digit code
                  <input
                    className={input}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  New password
                  <input
                    className={input}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                {!reset && (
                  <label className="block space-y-1 text-sm">
                    Transaction PIN
                    <input
                      className={input}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </label>
                )}
                <button type="submit" className={button} disabled={busy}>
                  {busy ? "Working…" : reset ? "Reset password" : "Activate"}
                </button>
              </>
            )}
          </form>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
