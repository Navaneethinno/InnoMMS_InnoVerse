import { lazy } from "react";
import { pageElement } from "./routeSupport";
const SignUp = lazy(() => import("@/Components/Onboarding/SignUp"));
export const onboardingRoutes = [{ path: "signup", element: pageElement(SignUp) }];
