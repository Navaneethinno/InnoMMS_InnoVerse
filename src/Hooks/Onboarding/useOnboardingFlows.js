import { individualOnboardingFlow } from "@/Services/Onboarding/individualOnboarding.api";
import { corporateOnboardingFlow } from "@/Services/Onboarding/corporateOnboarding.api";

// The calls this feature's screens make, through the hook layer (Component -> Hook -> Service).
// One stable object, so it is safe in effect and callback dependencies.
const actions = { individualOnboardingFlow, corporateOnboardingFlow };
export const useOnboardingFlows = () => actions;
