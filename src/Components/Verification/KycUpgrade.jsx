import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingWizardView from "@/Components/Onboarding/OnboardingWizardView";
import { useKycUpgradeWizard } from "@/Hooks/Kyc/useKycUpgradeWizard";

// "Complete your verification": a merchant approved at a lower KYC level
// completes the next one. The screens are the sign-up's.
export default function KycUpgrade() {
  const { t } = useTranslation();
  const flow = useKycUpgradeWizard();
  return (
    <div className="space-y-5">
      <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink">
        <ArrowLeft size={15} /> {t("kyc.backToProfile", { defaultValue: "Back to my profile" })}
      </Link>
      <OnboardingWizardView flow={flow} />
    </div>
  );
}
