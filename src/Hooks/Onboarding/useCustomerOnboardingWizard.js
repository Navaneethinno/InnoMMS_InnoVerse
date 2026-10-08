import { individualOnboardingFlow } from "@/Services/Onboarding/customerOnboarding.api";
import { useOnboardingWizard } from "./useOnboardingWizard";

// Individual customer onboarding. The category (a sub type from the
// `options` reply) and everything else is the shared engine in
// useOnboardingWizard.js.
export function useCustomerOnboardingWizard() {
  return useOnboardingWizard({ flowApi: individualOnboardingFlow, kind: "individual" });
}
