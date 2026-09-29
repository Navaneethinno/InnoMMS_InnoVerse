import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Check, Moon, ShieldCheck, Sun } from "lucide-react";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { useMerchantOnboarding } from "@/Hooks/Onboarding/useMerchantOnboarding";
import { MerchantOnboardingForm } from "./Signup/MerchantOnboardingForm";

const KINDS = ["individual", "corporate"];

// One kind's onboarding (keyed by kind, so switching starts that kind's own
// flow, which resumes its own application if one is stored): the side panel
// shows the kind switch before starting, then the sections and progress.
function SignupFlow({ kind, onKindChange, onDone }) {
  const { t } = useTranslation("signup");
  const flow = useMerchantOnboarding(kind);
  const { wizard, sections, activeSection, setActiveSection } = flow;
  const percent = wizard?.progress?.percent;

  return (
    <div className="grid gap-0 md:grid-cols-[300px_1fr]">
      <aside className="border-b border-border/70 bg-muted/40 p-6 md:border-b-0 md:border-r">
        {!wizard ? (
          <>
            <p className="mb-3 text-sm font-bold text-foreground">{t("applyAs")}</p>
            <SegmentedSwitch
              options={KINDS.map((k) => ({ value: k, label: t(`kind_${k}`) }))}
              value={kind}
              onChange={onKindChange}
            />
            <p className="mt-3 text-xs text-muted-foreground">{t(`kindHint_${kind}`)}</p>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-end justify-between">
              <p className="text-sm font-bold text-foreground">{t("yourProgress")}</p>
              {percent != null && <span className="text-sm font-bold text-primary">{percent}%</span>}
            </div>
            {percent != null && (
              <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${percent}%` }} />
              </div>
            )}
            <ol className="space-y-1">
              {sections.map((s, i) => {
                const done = s.state === "complete";
                const current = i === activeSection;
                return (
                  <li key={s.code}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${current ? "bg-primary-light" : "hover:bg-background/60"}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                          done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {done && !current ? <Check size={13} strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`min-w-0 truncate text-sm ${current ? "font-bold text-foreground" : "text-muted-foreground"}`}>{s.label ?? s.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <div className="mt-6 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <ShieldCheck size={13} className="text-primary" />
          {t("privacyNote")}
        </div>
      </aside>

      <section className="p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t(`subtitle_${kind}`)}</p>
        <MerchantOnboardingForm flow={flow} onDone={onDone} />
      </section>
    </div>
  );
}

// Sign up: merchant self-onboarding against /merchant/web (individual or
// corporate), the same flow as the customer portal's.
export function SignupPage() {
  const { t } = useTranslation("signup");
  const navigate = useNavigate();
  const { mode, toggleMode } = useColorMode();
  const [kind, setKind] = useState("individual");

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

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
          <SignupFlow key={kind} kind={kind} onKindChange={setKind} onDone={() => navigate("/login")} />
          <p className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
            {t("haveAccount")}{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-primary transition hover:text-primary/80">
              {t("signInLink")}
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
