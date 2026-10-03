import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { merchantAccountApi, merchantSession } from "@/Services/Merchant/merchantAccount.api";

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground";
const button =
  "rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
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
        <Link to="/login" className="block text-sm font-semibold text-primary">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
