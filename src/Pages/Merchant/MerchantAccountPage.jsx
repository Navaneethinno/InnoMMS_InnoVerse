import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { merchantAccountApi, merchantSession } from "@/Services/Merchant/merchantAccount.api";
import { CreditCard, History, LogOut, Moon, ShieldCheck, Sun, Wallet } from "lucide-react";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const button =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50";
const money = (amount, currency) => `${amount ?? "0"} ${currency ?? ""}`;
const date = (value) => (value ? new Date(value).toLocaleString() : "");
const dataItems = (value) =>
  Array.isArray(value) ? value : (value?.items ?? value?.wallets ?? []);

export function MerchantAccountPage() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const { displayName } = useBrandTheme();
  const [session, setSession] = useState(() => merchantSession.read());
  const [tab, setTab] = useState("payments");
  const [wallets, setWallets] = useState([]);
  const [history, setHistory] = useState({ items: [], total: 0, page: 1 });
  const [filters, setFilters] = useState({
    acct_id: "",
    txn_type: "MERCHANT_PAYMENT",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [security, setSecurity] = useState({
    passwordCurrent: "",
    passwordNext: "",
    pinCurrent: "",
    pinNext: "",
    otp: "",
    otpRef: "",
  });
  useEffect(() => {
    const sync = () => setSession(merchantSession.read());
    window.addEventListener("merchant:session", sync);
    return () => window.removeEventListener("merchant:session", sync);
  }, []);
  useEffect(() => {
    if (!session?.access_token) navigate("/login", { replace: true });
  }, [navigate, session]);
  useEffect(() => {
    if (!session?.access_token) return;
    void merchantAccountApi
      .me()
      .then(({ data }) => {
        if (data?.name && data.name !== session.name)
          merchantSession.save({ ...session, name: data.name });
      })
      .catch((error) => setError(error.message));
    // The session is refreshed by the request helper when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);
  const run = async (name, action) => {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      return await action();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    if (!session?.access_token) return;
    void run("wallets", async () => {
      const response = await merchantAccountApi.wallets();
      setWallets(dataItems(response.data));
    });
  }, [session?.access_token]);
  useEffect(() => {
    if (!session?.access_token || tab === "security") return;
    let active = true;
    void merchantAccountApi
      .history({
        page,
        limit: 20,
        ...Object.fromEntries(
          Object.entries({
            ...filters,
            txn_type: tab === "payments" ? "MERCHANT_PAYMENT" : filters.txn_type,
          }).filter(([, value]) => value),
        ),
      })
      .then(({ data }) => {
        if (active)
          setHistory({ items: dataItems(data), total: data?.total ?? 0, page: data?.page ?? page });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token, tab, page, filters]);
  const selectTransaction = (rrn) =>
    run("transaction", async () => {
      const { data } = await merchantAccountApi.transaction(rrn);
      setSelected(data);
      setQuote(null);
      setReceipt(null);
      setAmount("");
      setClientReference("");
    });
  const getQuote = () =>
    run("quote", async () => {
      if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0)
        throw new Error("Enter a valid refund amount.");
      const { data } = await merchantAccountApi.quote(selected.rrn, amount);
      setQuote(data);
      setClientReference(crypto.randomUUID());
    });
  const refund = () =>
    run("refund", async () => {
      if (!quote || !clientReference) throw new Error("Get a quote first.");
      const { data, message: reply } = await merchantAccountApi.refund({
        org_rrn: selected.rrn,
        amount,
        client_reference: clientReference,
        ...(quote.pin_required !== false ? { pin } : {}),
        note,
      });
      setMessage(reply || (data?.replayed ? "Refund already processed." : "Refund sent."));
      setQuote(null);
      setPin("");
      const refreshed = await merchantAccountApi.transaction(selected.rrn);
      setSelected(refreshed.data);
      setReceipt(data?.receipt ?? null);
      setTab("history");
    });
  const loadReceipt = (rrn, duplicate = false) =>
    run("receipt", async () => {
      const { data } = await merchantAccountApi.receipt(rrn, duplicate);
      setReceipt(data);
    });
  const signOut = (all = false) =>
    run("logout", async () => {
      await merchantAccountApi.logout(all);
      navigate("/login", { replace: true });
    });
  const changeSecret = (kind) =>
    run(kind, async () => {
      const result =
        kind === "password"
          ? await merchantAccountApi.passwordChange(security.passwordCurrent, security.passwordNext)
          : await merchantAccountApi.pinChange(security.pinCurrent, security.pinNext);
      setMessage(result.message);
      setSecurity({
        passwordCurrent: "",
        passwordNext: "",
        pinCurrent: "",
        pinNext: "",
        otp: "",
        otpRef: "",
      });
    });
  const startPinReset = () =>
    run("pinReset", async () => {
      const result = await merchantAccountApi.pinResetStart();
      setSecurity((value) => ({ ...value, otpRef: result.data?.otp_ref ?? "" }));
      setMessage(result.message);
    });
  const resetPin = () =>
    run("pinReset", async () => {
      const result = await merchantAccountApi.pinReset({
        otp_ref: security.otpRef,
        otp: security.otp,
        pin: security.pinNext,
      });
      setMessage(result.message);
      setSecurity({
        passwordCurrent: "",
        passwordNext: "",
        pinCurrent: "",
        pinNext: "",
        otp: "",
        otpRef: "",
      });
    });
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top_left,var(--primary-light),transparent_65%)]"
        aria-hidden="true"
      />
      <header className="relative border-b border-border/70 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                {displayName ?? "InnoMMS"}
              </p>
              <p className="text-xs text-muted-foreground">Merchant Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageDropdown />
            <button
              type="button"
              onClick={toggleMode}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
            >
              {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Your workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Welcome, {session?.name || "merchant"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your wallets, customer payments, refunds, and account security in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut(true)}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            Sign out all devices
          </button>
        </div>
        <nav
          className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm"
          aria-label="Merchant account sections"
        >
          {[
            ["payments", "Payments received"],
            ["history", "History"],
            ["security", "Security"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSelected(null);
                setReceipt(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === key ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {key === "payments" ? (
                <CreditCard size={15} />
              ) : key === "history" ? (
                <History size={15} />
              ) : (
                <ShieldCheck size={15} />
              )}
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-primary-light p-3 text-sm">
            {message}
          </p>
        )}
        {tab !== "security" && (
          <section className="grid gap-4 md:grid-cols-2" aria-label="Wallets">
            {wallets.map((wallet) => (
              <div
                key={wallet.acct_id ?? wallet.acct_num}
                className="rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <Wallet size={19} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {wallet.product_name ?? wallet.acct_prod_name ?? "Wallet"}
                </p>
                <p className="mt-1 font-mono text-xl font-bold tracking-tight">{wallet.acct_num}</p>
                <p className="mt-4 border-t border-border/70 pt-4 text-sm">
                  Available: <strong>{money(wallet.avail_bal, wallet.currency_code)}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Ledger: {money(wallet.ledger_bal, wallet.currency_code)}
                </p>
              </div>
            ))}
          </section>
        )}
        {tab !== "security" && (
          <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]">
            <h2 className="text-lg font-bold">
              {tab === "payments" ? "Payments received" : "Transaction history"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <select
                className={field}
                value={filters.acct_id}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, acct_id: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All wallets</option>
                {wallets.map((wallet) => (
                  <option key={wallet.acct_id} value={wallet.acct_id}>
                    {wallet.acct_num}
                  </option>
                ))}
              </select>
              {tab === "history" && (
                <select
                  className={field}
                  value={filters.txn_type}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, txn_type: e.target.value }));
                    setPage(1);
                  }}
                >
                  <option value="">All transactions</option>
                  <option value="MERCHANT_PAYMENT">Payments</option>
                  <option value="MERCHANT_REFUND">Refunds</option>
                  <option value="REVERSAL">Reversals</option>
                </select>
              )}
              <input
                type="date"
                className={field}
                value={filters.from}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, from: e.target.value }));
                  setPage(1);
                }}
              />
              <input
                type="date"
                className={field}
                value={filters.to}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, to: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="mt-4 divide-y divide-border">
              {history.items.map((item) => (
                <button
                  key={item.rrn}
                  type="button"
                  onClick={() => void selectTransaction(item.rrn)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left text-sm hover:text-primary"
                >
                  <span>
                    <strong>{item.description || item.txn_type}</strong>
                    <small className="block text-muted-foreground">
                      {item.counterparty_name} · {date(item.tran_date_time)} · RRN {item.rrn}
                    </small>
                  </span>
                  <strong>
                    {item.direction === "DR" ? "−" : "+"}
                    {money(item.net_amount ?? item.amount ?? item.txn_amount, item.currency_code)}
                  </strong>
                </button>
              ))}
              {!history.items.length && (
                <p className="py-6 text-sm text-muted-foreground">No transactions found.</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {history.page} · {history.total} transactions
              </span>
              <button
                type="button"
                disabled={page * 20 >= history.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </section>
        )}
        {selected && tab !== "security" && (
          <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]">
            <h2 className="text-lg font-bold">Transaction {selected.rrn}</h2>
            <p className="mt-2 text-sm">
              {selected.txn_type} · {selected.status} · {date(selected.tran_date_time)}
            </p>
            <p className="mt-2 text-sm">
              Amount: {money(selected.txn_amount, selected.currency_code)} · Fee:{" "}
              {money(selected.fee_amount, selected.currency_code)}
            </p>
            <p className="mt-2 text-sm">
              Remaining refundable: {money(selected.refundable, selected.currency_code)}
            </p>
            {selected.refund_rrns?.length > 0 && (
              <p className="mt-2 text-sm">Refunds: {selected.refund_rrns.join(", ")}</p>
            )}
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-primary"
              onClick={() => void loadReceipt(selected.rrn)}
            >
              View receipt
            </button>
            {selected.txn_type === "MERCHANT_PAYMENT" &&
              selected.status === "POSTED" &&
              Number(selected.refundable) > 0 && (
                <div className="mt-5 space-y-3 border-t border-border pt-5">
                  <h3 className="font-semibold">Refund this payment</h3>
                  <label className="block text-sm">
                    Amount
                    <input
                      className={`${field} mt-1`}
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setQuote(null);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={button}
                    disabled={busy === "quote"}
                    onClick={() => void getQuote()}
                  >
                    Get refund quote
                  </button>
                  {quote && (
                    <div className="space-y-3 rounded-xl bg-muted p-4 text-sm">
                      <p>
                        From: {quote.from?.acct_num ?? quote.from?.name ?? "Merchant wallet"} · To:{" "}
                        {quote.to?.name ?? "Customer"}
                      </p>
                      <p>
                        Total debit:{" "}
                        <strong>{money(quote.total_debit, selected.currency_code)}</strong> · Fee:{" "}
                        {money(quote.fee, selected.currency_code)}
                      </p>
                      <label className="block">
                        Note
                        <input
                          className={`${field} mt-1`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>
                      {quote.pin_required !== false && (
                        <label className="block">
                          Transaction PIN
                          <input
                            className={`${field} mt-1`}
                            type="password"
                            inputMode="numeric"
                            value={pin}
                            maxLength={6}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        className={button}
                        disabled={busy === "refund" || (quote.pin_required !== false && !pin)}
                        onClick={() => void refund()}
                      >
                        Confirm refund
                      </button>
                    </div>
                  )}
                </div>
              )}
          </section>
        )}
        {receipt && (
          <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]">
            <h2 className="text-lg font-bold">
              Receipt{" "}
              {receipt.print_count > 0 && <span className="text-sm text-amber-600">DUPLICATE</span>}
            </h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              {Object.entries(receipt)
                .filter(([key]) => key !== "print_count")
                .map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-2 py-2">
                    <dt className="text-muted-foreground">{key.replaceAll("_", " ")}</dt>
                    <dd className="max-w-full break-all text-right font-medium">
                      {value && typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value ?? "")}
                    </dd>
                  </div>
                ))}
            </dl>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary"
              onClick={() => void loadReceipt(receipt.rrn ?? selected?.rrn, true)}
            >
              Reprint receipt
            </button>
          </section>
        )}
        {tab === "security" && (
          <section className="grid gap-5 md:grid-cols-2">
            {session?.pin_locked && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">
                Your transaction PIN is locked. Use the PIN reset option below.
              </p>
            )}
            <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]">
              <h2 className="font-bold">Change password</h2>
              <input
                className={field}
                type="password"
                placeholder="Current password"
                value={security.passwordCurrent}
                onChange={(e) => setSecurity((s) => ({ ...s, passwordCurrent: e.target.value }))}
              />
              <input
                className={field}
                type="password"
                placeholder="New password"
                value={security.passwordNext}
                onChange={(e) => setSecurity((s) => ({ ...s, passwordNext: e.target.value }))}
              />
              <button
                type="button"
                className={button}
                onClick={() => void changeSecret("password")}
              >
                Change password
              </button>
            </div>
            <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-card/90 p-6 shadow-[0_12px_35px_rgba(30,64,125,0.08)]">
              <h2 className="font-bold">Transaction PIN</h2>
              <input
                className={field}
                type="password"
                inputMode="numeric"
                placeholder="Current PIN"
                value={security.pinCurrent}
                onChange={(e) =>
                  setSecurity((s) => ({ ...s, pinCurrent: e.target.value.replace(/\D/g, "") }))
                }
              />
              <input
                className={field}
                type="password"
                inputMode="numeric"
                placeholder="New PIN"
                value={security.pinNext}
                onChange={(e) =>
                  setSecurity((s) => ({ ...s, pinNext: e.target.value.replace(/\D/g, "") }))
                }
              />
              <button type="button" className={button} onClick={() => void changeSecret("pin")}>
                Change PIN
              </button>
              <button
                type="button"
                className="block text-sm font-semibold text-primary"
                onClick={() => void startPinReset()}
              >
                Forgot or locked PIN?
              </button>
              {security.otpRef && (
                <>
                  <input
                    className={field}
                    inputMode="numeric"
                    placeholder="Six-digit code"
                    value={security.otp}
                    onChange={(e) => setSecurity((s) => ({ ...s, otp: e.target.value }))}
                  />
                  <button type="button" className={button} onClick={() => void resetPin()}>
                    Reset PIN
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
