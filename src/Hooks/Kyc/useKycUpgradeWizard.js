import { useNavigate } from "react-router-dom";
import { kycUpgradeFlow } from "@/Services/Kyc/kyc.api";
import { useOnboardingWizard } from "@/Hooks/Onboarding/useOnboardingWizard";

// The signed-in "Complete your verification": the sign-up's screens for the
// merchant's own details, then back to the profile when submitted or dropped.
export function useKycUpgradeWizard() {
  const navigate = useNavigate();
  return useOnboardingWizard({ flowApi: kycUpgradeFlow, kind: "kyc", onLeave: () => navigate("/profile") });
}
