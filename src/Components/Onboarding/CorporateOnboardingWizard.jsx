import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { useCorporateOnboardingWizard } from "@/Hooks/Onboarding/useCorporateOnboardingWizard";
import CategoryField from "./CategoryField";
import OnboardingWizardView from "./OnboardingWizardView";

// Runs a prospective CORPORATE merchant through the institution's
// published onboarding configuration. It works exactly like the individual
// wizard (same calls, under /merchant/corporate/web/*); only the heading
// differs, and the shared OnboardingWizardView does the rest.
export default function CorporateOnboardingWizard({ onSubmitted, onActiveChange, partyType }) {
  const { t } = useTranslation();
  const flow = useCorporateOnboardingWizard({ partyType });
  const identityFields = <CategoryField flow={flow} label={t("onb.companyType")} icon={Building2} heading={t("onb.aboutCompany")} />;
  return <OnboardingWizardView flow={flow} identityFields={identityFields} onSubmitted={onSubmitted} onActiveChange={onActiveChange} />;
}
