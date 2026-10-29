import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Account module: Profile, Security and the KYC upgrade opened from the
// profile (/verification has no sidebar entry of its own).
const Profile = lazy(() => import("@/Components/Account/Profile/Profile"));
const KycUpgrade = lazy(() => import("@/Components/Account/Verification/KycUpgrade"));
const Security = lazy(() => import("@/Components/Account/Security/Security"));
export const accountRoutes = [
  { path: "profile", element: pageElement(Profile) },
  { path: "verification", element: pageElement(KycUpgrade) },
  { path: "security", element: pageElement(Security) },
];
