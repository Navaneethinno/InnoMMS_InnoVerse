import { corporateOnboardingFlow } from "@/Services/Onboarding/corporateOnboarding.api";
import { useOnboardingWizard } from "./useOnboardingWizard";

// Corporate merchant onboarding: the same calls as the individual flow,
// under /merchant/corporate/web/*. Everything is the shared engine in
// useOnboardingWizard.js.
export function useCorporateOnboardingWizard() {
  return useOnboardingWizard({ flowApi: corporateOnboardingFlow, kind: "corporate" });
}
