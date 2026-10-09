import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Building2,
  Camera,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useOnboardingWizard } from "@/Hooks/Onboarding/useOnboardingWizard";
import CategoryField from "@/Components/Onboarding/CategoryField";
import OnboardingWizardView from "@/Components/Onboarding/OnboardingWizardView";
import { assistedFlows } from "@/Services/Agent/agent.api";
import { STORAGE_KEYS } from "@/Utils/Constant";
import { isSuperAgent } from "@/Utils/Lib/roles";

// Assisted sign-up (handoff, phase 4): an agent signs a CUSTOMER up from its own
// session, and a super agent also signs AGENTS up. It is the self sign-up form
// (same screens, same rules), run with the agent's Bearer token on the
// /customer/{kind}/agent/ or /merchant/{kind}/agent/ paths. The new person
// still confirms their phone with the SMS code (they read it out to the agent),
// and the sign-up still goes through the bank's review.
//
// ?who=customer|agent&kind=individual|corporate&ref=<reference_id> continues a
// sign-up from the list ("Continue").
const kindKey = (who, kind) => `assisted-${who}-${kind}`;

// `continuing`: open that sign-up (the wizard resumes the reference stored for
// its flow); otherwise start clean. Written before the wizard reads it.
function Wizard({ flowApi, storageKind, continuing, onSubmitted, heading }) {
  useState(() => {
    try {
      const key = STORAGE_KEYS.onboardingReference(storageKind);
      if (continuing) window.localStorage.setItem(key, continuing);
      else window.localStorage.removeItem(key);
    } catch {
      /* The wizard starts from the contact instead. */
    }
    return true;
  });
  const flow = useOnboardingWizard({ flowApi, kind: storageKind });
  const identityFields = (
    <CategoryField flow={flow} icon={Users} heading={heading} />
  );
  return (
    <OnboardingWizardView
      flow={flow}
      identityFields={identityFields}
      onSubmitted={onSubmitted}
    />
  );
}

export default function AssistedSignup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [params] = useSearchParams();
  const superAgent = isSuperAgent(user);
  const who =
    params.get("who") === "agent" && superAgent ? "agent" : "customer";
  const [kind, setKind] = useState(
    params.get("kind") === "corporate" ? "corporate" : "individual",
  );
  const continuing = params.get("ref");

  const flowApi = useMemo(() => {
    // The server offers a super agent only the types it may sign up (Agent tier).
    if (who === "agent")
      return kind === "corporate"
        ? assistedFlows.agentCorporate
        : assistedFlows.agentIndividual;
    return kind === "corporate"
      ? assistedFlows.customerCorporate
      : assistedFlows.customerIndividual;
  }, [who, kind]);
  const storageKind = kindKey(who, kind);

  // Company sign-up is offered when the bank has a corporate type on this path.
  const [corporateOffered, setCorporateOffered] = useState(false);
  useEffect(() => {
    let live = true;
    const corporate =
      who === "agent"
        ? assistedFlows.agentCorporate
        : assistedFlows.customerCorporate;
    corporate
      .loadOptions()
      .then(
        (options) =>
          live && setCorporateOffered((options?.party_types ?? []).length > 0),
      )
      .catch(() => live && setCorporateOffered(false));
    return () => {
      live = false;
    };
  }, [who]);

  const title =
    who === "agent"
      ? t("signups.newAgent", { defaultValue: "Sign up an agent" })
      : t("signups.newCustomer", { defaultValue: "Sign up a customer" });
  return (
    <div className="max-w-6xl">
      <Link
        to="/signups"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink"
      >
        <ArrowLeft size={15} />{" "}
        {t("signups.back", { defaultValue: "Back to sign-ups" })}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {who === "agent"
              ? t("signups.agentHint", {
                  defaultValue:
                    "Once the bank approves, the new agent is placed under you.",
                })
              : t("signups.customerHint", {
                  defaultValue:
                    "The customer confirms their phone with the code we send them. Every sign-up is reviewed by the bank.",
                })}
          </p>
        </div>
        {!continuing && corporateOffered && (
          <div className="inline-flex rounded-full border border-ink/20 bg-surface p-1 shadow-sm">
            {[
              {
                value: "individual",
                label: t("signup.individual"),
                icon: UserRound,
              },
              {
                value: "corporate",
                label: t("signup.corporate"),
                icon: Building2,
              },
            ].map(({ value, label, icon }) => {
              const KindIcon = icon;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${kind === value ? "bg-forest text-white dark:bg-lime dark:text-on-secondary" : "text-ink/70 hover:bg-ink/5"}`}
                >
                  <KindIcon size={15} /> {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="mb-5 flex items-start gap-2 rounded-2xl border border-slate-200 bg-surface px-4 py-3 text-sm text-slate-600 shadow-sm">
        <Camera size={16} className="mt-0.5 shrink-0 text-ink" />
        {t("signups.photoHint", {
          defaultValue:
            "Take the photos of the real person with this device's camera: the selfie is checked against the document photo.",
        })}
      </p>
      <div className="rounded-3xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-8">
        <Wizard
          key={`${storageKind}-${continuing ?? "new"}`}
          flowApi={flowApi}
          storageKind={storageKind}
          continuing={continuing}
          heading={
            who === "agent"
              ? t("signups.agentType", { defaultValue: "Agent type" })
              : t("signups.customerType", { defaultValue: "Customer type" })
          }
          onSubmitted={() => navigate("/signups")}
        />
      </div>
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck size={14} /> {t("signup.privacyNote")}
      </p>
    </div>
  );
}
