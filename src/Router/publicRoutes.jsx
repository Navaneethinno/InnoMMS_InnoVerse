import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { pageElement } from "./routeSupport";
import { onboardingRoutes } from "./onboardingRoutes";
const Login = lazy(() => import("@/Components/Auth/Login"));
const ActivateAccess = lazy(() => import("@/Components/Auth/ActivateAccess"));
const ForgotPassword = lazy(() => import("@/Components/Auth/ForgotPassword"));
const ForgotPin = lazy(() => import("@/Components/Auth/ForgotPin"));
const LegalPage = lazy(() => import("@/Components/Auth/LegalPage"));
export const publicRoutes = [
  { index: true, element: <Navigate to="/login" replace /> },
  { path: "login", element: pageElement(Login) },
  { path: "activate", element: pageElement(ActivateAccess) },
  { path: "forgot-password", element: pageElement(ForgotPassword) },
  { path: "forgot-pin", element: pageElement(ForgotPin) },
  { path: "terms", element: pageElement(LegalPage, { kind: "terms" }) },
  { path: "privacy", element: pageElement(LegalPage, { kind: "privacy" }) },
  ...onboardingRoutes,
  { path: "*", element: <Navigate to="/login" replace /> },
];
