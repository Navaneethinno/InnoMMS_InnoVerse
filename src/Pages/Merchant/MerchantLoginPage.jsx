import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { merchantAccountApi, merchantSession } from "@/Services/Merchant/merchantAccount.api";

export function MerchantLoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (merchantSession.read()?.access_token) return <Navigate to="/account" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await merchantAccountApi.login(loginId.trim(), password);
      navigate("/account", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Merchant portal</p>
        <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the email or mobile number you registered with.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-1 text-sm">
            Email or mobile number
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            Password
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm font-semibold text-primary">
          <Link to="/activate">Activate access</Link>
          <Link to="/forgot-password">Reset password</Link>
          <Link to="/signup">Apply as merchant</Link>
        </div>
      </div>
    </main>
  );
}
