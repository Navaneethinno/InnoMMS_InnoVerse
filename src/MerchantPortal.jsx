import { useEffect, useMemo, useState } from "react";
import "./auth-layout.css";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";

const SESSION_KEY = "innoverse-merchant-session";
const ACCOUNT_KEY = "innoverse-merchant-account";
const LANGUAGE_KEY = "innoverse-language";
const translations = {
  en: { secure: "Secure merchant workspace", title: "Run your business with a clearer view of every day.", subtitle: "Manage your merchant account, keep your business details current, and grow into the Innoverse ecosystem from one calm workspace.", getStarted: "Get started", welcome: "Welcome back", create: "Create your merchant account", signIn: "Sign in to your portal", setup: "Set up your workspace in a few minutes.", ready: "Your business workspace is ready when you are.", username: "Username", business: "Business name", email: "Email address", phone: "Phone number", password: "Password", confirm: "Confirm password", signInButton: "Sign in", createButton: "Create account", dashboard: "Dashboard", account: "My account", support: "Support", workspace: "Merchant workspace", glance: "Your business at a glance", accountStatus: "Account status", merchantId: "Merchant ID", profile: "Profile completion", next: "Next step", active: "Active", readyStatus: "Ready", profileInfo: "Your business information", logout: "Logout", language: "Language" },
  pt: { secure: "Espaço seguro do comerciante", title: "Administre o seu negócio com uma visão mais clara de cada dia.", subtitle: "Gira a sua conta de comerciante, mantenha os dados atualizados e cresça no ecossistema Innoverse.", getStarted: "Começar", welcome: "Bem-vindo novamente", create: "Crie a sua conta de comerciante", signIn: "Entrar no seu portal", setup: "Configure o seu espaço em poucos minutos.", ready: "O seu espaço está pronto quando você estiver.", username: "Nome de utilizador", business: "Nome da empresa", email: "Endereço de e-mail", phone: "Número de telefone", password: "Palavra-passe", confirm: "Confirmar palavra-passe", signInButton: "Entrar", createButton: "Criar conta", dashboard: "Painel", account: "A minha conta", support: "Suporte", workspace: "Espaço do comerciante", glance: "O seu negócio num relance", accountStatus: "Estado da conta", merchantId: "ID do comerciante", profile: "Perfil preenchido", next: "Próximo passo", active: "Ativa", readyStatus: "Pronta", profileInfo: "Informações da empresa", logout: "Sair", language: "Idioma" },
};
const useText = (language) => (key) => translations[language]?.[key] ?? translations.en[key] ?? key;

function Logo({ compact = false }) {
  return <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-sm font-black text-white shadow-lg shadow-primary/20">I</div>{!compact && <div><p className="text-sm font-black tracking-tight">Innoverse</p><p className="text-[10px] font-medium text-muted-foreground">Merchant Portal</p></div>}</div>;
}

function Field({ label, type = "text", value, onChange, placeholder, required = true }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-foreground">{label}{required && <span className="ml-1 text-primary">*</span>}</span><input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>;
}

function ThemeToggle({ dark, onToggle }) {
  const selected = localStorage.getItem(LANGUAGE_KEY) || "en";
  return <div className="flex items-center gap-2"><label className="flex items-center rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-bold text-foreground"><select aria-label="Select language" defaultValue={selected} onChange={(e) => { localStorage.setItem(LANGUAGE_KEY, e.target.value); window.location.reload(); }} className="border-0 bg-transparent p-0 text-xs font-bold outline-none"><option value="en">English</option><option value="pt">Português</option></select></label><button onClick={onToggle} className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:text-primary" aria-label="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button></div>;
}

function LanguageDropdown() { return null; }

function AuthPage({ mode, account, onSubmit, onSwitch, dark, onToggle, language, onLanguageChange }) {
  const t = useText(language);
  const signup = mode === "signup";
  useEffect(() => {
    document.body.dataset.authMode = mode;
    return () => { delete document.body.dataset.authMode; };
  }, [mode]);
  const [form, setForm] = useState({ username: "", businessName: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState("business-details");
  const registrationSteps = [
    { id: "business-details", label: "Business details" },
    { id: "contact-details", label: "Contact details" },
    { id: "secure-account", label: "Secure account" },
  ];
  const update = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));
  const goToRegistrationStep = (stepId) => {
    setActiveStep(stepId);
    const section = document.getElementById(stepId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (signup && (!form.username || !form.businessName || !form.email || !form.password || !form.confirm)) return setError("Please complete all required fields.");
    if (!signup && (!form.username || !form.password)) return setError("Enter your username, mobile number or email, and password.");
    if (signup && form.password !== form.confirm) return setError("Passwords do not match.");
    if (signup && form.password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setBusy(false);
    const result = onSubmit(form);
    if (result) setError(result);
  };
  return <div className="min-h-screen bg-background px-5 py-6"><div className="mx-auto flex max-w-6xl items-center justify-between"><Logo /><div className="flex items-center gap-2"><LanguageDropdown language={language} onChange={onLanguageChange} /><ThemeToggle dark={dark} onToggle={onToggle} /></div></div><div className="mx-auto grid max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-20"><div className="hidden lg:block"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-3 py-1.5 text-xs font-bold text-primary"><ShieldCheck size={14} /> {t("secure")}</div><h1 className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-foreground">{t("title")}</h1><p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">{t("subtitle")}</p></div><div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-primary/10 sm:p-8"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{signup ? t("getStarted") : t("welcome")}</p><h2 className="mt-2 text-2xl font-black">{signup ? t("create") : t("signIn")}</h2><p className="mt-2 text-sm text-muted-foreground">{signup ? t("setup") : t("ready")}</p></div>{signup && <div className="registration-steps" aria-label="Registration steps"><p className="registration-steps__title">Registration steps</p>{registrationSteps.map((step, index) => <button key={step.id} type="button" onClick={() => goToRegistrationStep(step.id)} className={`registration-step ${activeStep === step.id ? "is-active" : ""}`}><span className="registration-step__number">{index + 1}</span><span className="registration-step__label">{step.label}</span></button>)}</div>}<form onSubmit={submit} className="space-y-4">{signup && <><div id="business-details" className="step-group space-y-4"><Field label={t("username")} value={form.username} onChange={update("username")} placeholder="Choose a username" /><Field label={t("business")} value={form.businessName} onChange={update("businessName")} placeholder="e.g. Northstar Foods" /></div><div id="contact-details" className="step-group space-y-4"><Field label={t("email")} type="email" value={form.email} onChange={update("email")} placeholder="you@business.com" /><Field label={t("phone")} required={false} value={form.phone} onChange={update("phone")} placeholder="+1 555 000 0000" /></div><div id="secure-account" className="step-group space-y-4"><Field label={t("password")} type="password" value={form.password} onChange={update("password")} placeholder="At least 8 characters" /><Field label={t("confirm")} type="password" value={form.confirm} onChange={update("confirm")} placeholder="Repeat your password" /></div></>}{!signup && <Field label={`${t("username")}, mobile number or email`} value={form.username} onChange={update("username")} placeholder="Enter a registered login" />}{!signup && <Field label={t("password")} type="password" value={form.password} onChange={update("password")} placeholder="At least 8 characters" />} {error && <p className="rounded-xl bg-destructive-soft px-3 py-2.5 text-xs font-semibold text-red-600">{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Please wait…" : signup ? t("createButton") : t("signInButton")}<ArrowRight size={16} /></button></form><p className="mt-6 text-center text-sm text-muted-foreground">{signup ? "Already have an account?" : "New to Innoverse?"} <button onClick={onSwitch} className="font-bold text-primary hover:underline">{signup ? t("signInButton") : t("createButton")}</button></p></div></div></div>;
}

function Dashboard({ merchant, onLogout, dark, onToggle, language, onLanguageChange }) {
  const t = useText(language);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection] = useState("Dashboard");
  const nav = [[LayoutDashboard, "Dashboard"], [UserRound, "My account"], [CircleHelp, "Support"]];
  const initials = useMemo(() => (merchant.businessName || "Merchant").slice(0, 2).toUpperCase(), [merchant.businessName]);
  return <div className="min-h-screen bg-background"><aside className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-border bg-card/90 p-5 backdrop-blur-xl transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="flex items-center justify-between"><Logo /><button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-muted-foreground lg:hidden"><X size={18} /></button></div><div className="mt-10 space-y-1">{nav.map(([Icon, label]) => <button key={label} onClick={() => { setSection(label); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${section === label ? "bg-primary-light text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={17} />{label}{label === "Dashboard" && <ChevronRight size={15} className="ml-auto" />}</button>)}</div><div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-primary-light p-4"><p className="text-xs font-black text-primary">Need a hand?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Our support team is here for your next step.</p><button className="mt-3 text-xs font-bold text-primary">Contact support <ArrowRight size={12} className="inline" /></button></div></aside>{sidebarOpen && <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden" />}<main className="lg:pl-72"><header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-xl sm:px-8"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-border bg-card p-2.5 lg:hidden"><Menu size={18} /></button><div><p className="text-xs font-medium text-muted-foreground">Merchant workspace</p><p className="text-sm font-black">{section}</p></div></div><div className="flex items-center gap-2"><ThemeToggle dark={dark} onToggle={onToggle} /><div className="hidden items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:flex"><div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-light text-xs font-black text-primary">{initials}</div><div className="leading-tight"><p className="text-xs font-bold">{merchant.businessName}</p><p className="text-[10px] text-muted-foreground">Merchant</p></div></div><button onClick={onLogout} className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground hover:text-destructive" aria-label="Logout"><LogOut size={16} /></button></div></header><div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Good morning, {merchant.businessName.split(" ")[0]}</p><h1 className="mt-1 text-3xl font-black tracking-tight">Your business at a glance</h1><p className="mt-2 text-sm text-muted-foreground">A simple starting point for your Innoverse journey.</p></div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary">Account settings <ArrowRight size={14} /></button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-muted-foreground">Account status</p><span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-black text-emerald-600">Active</span></div><p className="mt-5 text-2xl font-black">Ready</p><p className="mt-1 text-xs text-muted-foreground">Your portal access is enabled</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold text-muted-foreground">Merchant ID</p><p className="mt-5 text-2xl font-black tracking-tight">{merchant.merchantCode}</p><p className="mt-1 text-xs text-muted-foreground">Use this when contacting support</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold text-muted-foreground">Profile completion</p><p className="mt-5 text-2xl font-black">72%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-brand-gradient" /></div></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-semibold text-muted-foreground">Next step</p><p className="mt-5 text-lg font-black">Complete your profile</p><button className="mt-2 text-xs font-bold text-primary hover:underline">Continue setup <ArrowRight size={12} className="inline" /></button></div></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Merchant account</p><h2 className="mt-2 text-xl font-black">Your business information</h2></div><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={18} /></button></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Business name</p><p className="mt-1 text-sm font-bold">{merchant.businessName}</p></div><div><p className="text-xs text-muted-foreground">Email address</p><p className="mt-1 text-sm font-bold">{merchant.email}</p></div><div><p className="text-xs text-muted-foreground">Phone number</p><p className="mt-1 text-sm font-bold">{merchant.phone || "Add a phone number"}</p></div><div><p className="text-xs text-muted-foreground">Member since</p><p className="mt-1 text-sm font-bold">September 2026</p></div></div><button className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline">View and edit account <ArrowRight size={13} /></button></section><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-primary"><Check size={19} /></div><div><p className="text-sm font-black">You’re off to a good start</p><p className="mt-1 text-xs text-muted-foreground">Your account is ready for the next stage.</p></div></div><div className="mt-7 space-y-4">{[["Account created", true], ["Email added", true], ["Profile completed", false]].map(([item, done]) => <div key={item} className="flex items-center gap-3"><div className={`grid h-6 w-6 place-items-center rounded-full ${done ? "bg-success text-white" : "border-2 border-border text-muted-foreground"}`}>{done ? <Check size={13} /> : <span className="text-[10px] font-black">3</span>}</div><p className={`text-xs font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{item}</p>{!done && <span className="ml-auto text-[10px] font-bold text-primary">Continue</span>}</div>)}</div></section></div></div></main></div>;
}

export default function MerchantPortal() {
  const [merchant, setMerchant] = useState(() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; } });
  const [account, setAccount] = useState(() => { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || null; } catch { return null; } });
  const [mode, setMode] = useState("login");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "en");
  const [dark, setDark] = useState(() => localStorage.getItem("merchant-theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("merchant-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { localStorage.setItem(LANGUAGE_KEY, language); document.documentElement.lang = language; }, [language]);
  const submit = (form) => {
    if (mode === "signup") {
      const nextAccount = { username: form.username.trim(), businessName: form.businessName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), password: form.password, merchantCode: `MER-${Math.floor(100000 + Math.random() * 899999)}` };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
      setAccount(nextAccount);
      setMode("login");
      return;
    }
    if (!account) return "No merchant account is registered yet. Please sign up first.";
    const identity = form.username.trim().toLowerCase();
    const validIdentity = [account.username, account.email, account.phone].filter(Boolean).some((value) => value.toLowerCase() === identity);
    if (!validIdentity || form.password !== account.password) return "Those credentials do not match a registered merchant account.";
    const next = { businessName: account.businessName, email: account.email, phone: account.phone, username: account.username, merchantCode: account.merchantCode };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setMerchant(next);
  };
  if (merchant) return <Dashboard merchant={merchant} language={language} onLanguageChange={setLanguage} dark={dark} onToggle={() => setDark((value) => !value)} onLogout={() => { localStorage.removeItem(SESSION_KEY); setMerchant(null); setMode("login"); }} />;
  return <AuthPage mode={mode} account={account} language={language} onLanguageChange={setLanguage} dark={dark} onToggle={() => setDark((value) => !value)} onSwitch={() => setMode((value) => value === "login" ? "signup" : "login")} onSubmit={submit} />;
}
