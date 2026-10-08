import { API_ENDPOINTS } from "@/Utils/Constant";
import { createOnboardingApi } from "./onboardingApiFactory";

// Merchant self-onboarding (Individual) runtime API, under
// /individual/*. The sections, fields, options and rules all
// come from the bank's own configuration in every reply — nothing here is
// hard-coded, render whatever `sections` returns.
export const individualOnboardingFlow = createOnboardingApi(API_ENDPOINTS.INDIVIDUAL_ONBOARDING);
