import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { useIndividualOnboardingWizard } from "@/Hooks/Onboarding/useIndividualOnboardingWizard";
import CategoryField from "./CategoryField";
import OnboardingWizardView from "./OnboardingWizardView";

// Runs a prospective INDIVIDUAL merchant through the institution's
// published onboarding configuration — the self-service version: the
// merchant picks their category (when there is a choice) and fills in
// their own information, one section at a time. Everything except the
// heading is the shared OnboardingWizardView, driven by
// useIndividualOnboardingWizard.
export default function IndividualOnboardingWizard({ onSubmitted, onActiveChange, tourRequest }) {
  const { t } = useTranslation();
  const flow = useIndividualOnboardingWizard();
  const identityFields = <CategoryField flow={flow} icon={Users} heading={t("onb.aboutYou")} />;
  return <OnboardingWizardView flow={flow} identityFields={identityFields} onSubmitted={onSubmitted} onActiveChange={onActiveChange} tourRequest={tourRequest} tourEnabled />;
}
