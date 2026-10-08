import { individualOnboardingFlow } from "@/Services/Onboarding/individualOnboarding.api";
import { useOnboardingWizard } from "./useOnboardingWizard";

// Individual merchant onboarding. The category (a sub type from the
// `options` reply) and everything else is the shared engine in
// useOnboardingWizard.js.
export function useIndividualOnboardingWizard() {
  return useOnboardingWizard({ flowApi: individualOnboardingFlow, kind: "individual" });
}
