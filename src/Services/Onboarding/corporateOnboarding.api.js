import { API_ENDPOINTS } from "@/Utils/Constant";
import { createOnboardingApi } from "./onboardingApiFactory";

// Customer self-onboarding (Corporate) runtime API, under
// /corporate/*. Same shape as the individual flow (same
// envelope, verbs and error handling); only the paths and the options/add
// payload differ (party type + company type, no ownership/sub-type axis, no
// KYC levels).
export const corporateOnboardingFlow = createOnboardingApi(API_ENDPOINTS.CORPORATE_ONBOARDING);
