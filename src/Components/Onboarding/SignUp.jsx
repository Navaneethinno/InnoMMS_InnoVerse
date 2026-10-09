import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  ShieldCheck,
  Sparkles,
  UserRound,
  Building2,
  Banknote,
  Store,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "@/Components/Common/PageHeader";
import AppHeader from "@/Components/Common/AppHeader";
import Footer from "@/Components/Layout/Footer";
import IndividualOnboardingWizard from "./IndividualOnboardingWizard";
import CorporateOnboardingWizard from "./CorporateOnboardingWizard";
import { corporateOnboardingFlow } from "@/Services/Onboarding/corporateOnboarding.api";
import { individualOnboardingFlow } from "@/Services/Onboarding/individualOnboarding.api";

// Who is signing up (Agents, stores and POS, phase 1): agents sign up and sign
// in through this same portal. Offered when the bank's options list the AGENT
// party type; the form then shows only that party's categories.
const PARTIES = [
  { value: "MERCHANT", labelKey: "signup.asMerchant", fallback: "As a merchant", icon: Store },
  { value: "AGENT", labelKey: "signup.asAgent", fallback: "As an agent", icon: Banknote },
];

// Which onboarding flow the picker below routes to — an individual pick
// runs IndividualOnboardingWizard, a corporate pick runs
// CorporateOnboardingWizard. They're separate components (each with its own
// hook), so switching here simply unmounts one and mounts the other.
const MERCHANT_KINDS = [
  { value: "individual", labelKey: "signup.individual", icon: UserRound },
  { value: "corporate", labelKey: "signup.corporate", icon: Building2 },
];

// Self-service registration entry point: a prospective merchant lands here
// (from the sign-in page's "Get started" link) and runs themselves through
// the institution's published onboarding form via IndividualOnboardingWizard.
export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [merchantKind, setMerchantKind] = useState("individual");
  // The whole flow is one full page. Before the form starts it shows the
  // intro and the Individual/Corporate choice; once the form is on screen
  // those give way to the steps. The wizard element keeps its place in the
  // tree either way so its state is never lost.
  const [formActive, setFormActive] = useState(false);
  // Bumped by "Take a tour"; each new value starts the tour again.
  const [tourRequest, setTourRequest] = useState(0);
  // Corporate is offered only when the institution has set up a corporate
  // merchant type (its options list party types); until that is known, and
  // when there is none, only Individual shows.
  const [corporateOffered, setCorporateOffered] = useState(false);
  // MERCHANT or AGENT, once the bank is known to offer agents.
  const [agentOffered, setAgentOffered] = useState(false);
  const [partyType, setPartyType] = useState("MERCHANT");
  // The party types the bank has a company form for.
  const [corporateParties, setCorporateParties] = useState([]);
  useEffect(() => {
    let live = true;
    Promise.allSettled([individualOnboardingFlow.loadOptions(), corporateOnboardingFlow.loadOptions()]).then((results) => {
      if (!live) return;
      const namesOf = (r) => (r.status === "fulfilled" ? (r.value?.party_types ?? []).map((p) => p.name) : []);
      const names = [...namesOf(results[0]), ...namesOf(results[1])];
      setCorporateParties(namesOf(results[1]));
      setAgentOffered(names.includes("AGENT") && names.includes("MERCHANT"));
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    corporateOnboardingFlow
      .loadOptions()
      .then((options) => !cancelled && setCorporateOffered((options?.party_types ?? []).length > 0))
      .catch(() => !cancelled && setCorporateOffered(false));
    return () => {
      cancelled = true;
    };
  }, []);


  return (
    <div className="flex min-h-screen flex-col bg-paper bg-fixed bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.28),rgb(var(--color-secondary)/0.16)_50%,rgb(var(--color-secondary)/0.26))] dark:bg-[linear-gradient(160deg,rgb(var(--color-secondary)/0.07),rgb(var(--color-secondary)/0.02)_50%,rgb(var(--color-secondary)/0.06))]">
      {/* Floating header card, pinned to the top while the page scrolls. */}
      <div className="sticky top-0 z-30 px-4 pt-4 sm:px-10 sm:pt-5 xl:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <AppHeader
            action={
              <>
                {formActive && merchantKind === "individual" && (
                  <button
                    type="button"
                    onClick={() => setTourRequest((n) => n + 1)}
                    aria-label={t("signup.takeTour")}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-forest px-3 py-2 text-sm font-bold text-white transition hover:bg-forest/90 sm:px-5 sm:py-2.5 dark:bg-lime dark:text-on-secondary dark:hover:bg-lime/90"
                  >
                    <Compass size={15} />
                    <span className="hidden sm:inline">
                      {t("signup.takeTour")}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  aria-label={
                    formActive ? t("signup.exit") : t("signup.backToSignIn")
                  }
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-forest px-3 py-2 text-sm font-bold text-forest transition hover:bg-forest/5 sm:px-5 sm:py-2.5 dark:border-lime dark:text-lime dark:hover:bg-lime/10"
                >
                  {formActive ? <X size={15} /> : <ArrowLeft size={15} />}
                  <span className="hidden sm:inline">
                    {formActive ? t("signup.exit") : t("signup.backToSignIn")}
                  </span>
                </button>
              </>
            }
          />
        </div>
      </div>
      <section
        className={`px-4 sm:px-10 xl:px-16 ${formActive ? "pb-2" : "pb-6 sm:pb-8"}`}
      >
        <div className="mx-auto w-full max-w-6xl">
          {!formActive && (
            <div className="mx-auto max-w-3xl pt-9 text-center">
              <PageHeader
                eyebrow={t("signup.eyebrow")}
                title={t("signup.title")}
                description={t("signup.description")}
              />
            </div>
          )}
        </div>
      </section>
      <main className="w-full flex-1 px-6 pb-16 sm:px-10 xl:px-16">
        <div
          className={`mx-auto w-full ${formActive ? "max-w-6xl pt-8" : "max-w-3xl pt-0"}`}
        >
          {!formActive && agentOffered && (
            <div className="mt-8 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink/60">
                {t("signup.whoAreYou", { defaultValue: "Sign up" })}
              </p>
              <div className="inline-flex rounded-full border border-ink/20 bg-surface p-1 shadow-sm">
                {PARTIES.map((party) => {
                  const PartyIcon = party.icon;
                  return (
                    <button
                      key={party.value}
                      type="button"
                      onClick={() => {
                        setPartyType(party.value);
                        if (!corporateParties.includes(party.value)) setMerchantKind("individual");
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition ${
                        partyType === party.value ? "bg-forest text-white dark:bg-lime dark:text-on-secondary" : "text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      <PartyIcon size={15} /> {t(party.labelKey, { defaultValue: party.fallback })}
                    </button>
                  );
                })}
              </div>
              {partyType === "AGENT" && (
                <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">
                  {t("signup.agentNote", {
                    defaultValue: "Agents serve customers with cash in and cash out. After the bank approves you, sign in here with your phone and PIN.",
                  })}
                </p>
              )}
            </div>
          )}
          {!formActive && corporateOffered && (!agentOffered || corporateParties.includes(partyType)) && (
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-full border border-ink/20 bg-surface p-1 shadow-sm">
                {MERCHANT_KINDS.map((kind) => {
                  const Icon = kind.icon;
                  return (
                    <button
                      key={kind.value}
                      type="button"
                      onClick={() => setMerchantKind(kind.value)}
                      className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition ${
                        merchantKind === kind.value
                          ? "bg-forest text-white dark:bg-lime dark:text-on-secondary"
                          : "text-ink/70 hover:bg-ink/5"
                      }`}
                    >
                      <Icon size={15} /> {t(kind.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div
            className={
              formActive
                ? ""
                : "mt-6 rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-10"
            }
          >
            {merchantKind === "corporate" ? (
              <CorporateOnboardingWizard
                key={`corporate-${partyType}`}
                partyType={agentOffered ? partyType : undefined}
                onSubmitted={() => navigate("/login")}
                onActiveChange={setFormActive}
              />
            ) : (
              <IndividualOnboardingWizard
                key={`individual-${partyType}`}
                partyType={agentOffered ? partyType : undefined}
                onSubmitted={() => navigate("/login")}
                onActiveChange={setFormActive}
                tourRequest={tourRequest}
              />
            )}
          </div>
          {!formActive && (
            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
              <ShieldCheck size={14} className="shrink-0" />
              <span>{t("signup.privacyNote")}</span>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
