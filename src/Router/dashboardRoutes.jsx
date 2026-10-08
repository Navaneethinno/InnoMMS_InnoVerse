import { lazy } from "react";
import { pageElement } from "./routeSupport";
const Dashboard = lazy(() => import("@/Components/Dashboard/Dashboard"));
const Send = lazy(() => import("@/Components/Account/Send"));
const History = lazy(() => import("@/Components/Account/History"));
const Security = lazy(() => import("@/Components/Account/Security"));
const Cards = lazy(() => import("@/Components/Cards/Cards"));
const Inbox = lazy(() => import("@/Components/Inbox/Inbox"));
const Profile = lazy(() => import("@/Components/Profile/Profile"));
const KycUpgrade = lazy(() => import("@/Components/Kyc/KycUpgrade"));
const Statements = lazy(() => import("@/Components/Statements/Statements"));
export const dashboardRoutes = [
  { path: "dashboard", element: pageElement(Dashboard) },
  { path: "send", element: pageElement(Send) },
  { path: "history", element: pageElement(History) },
  { path: "cards", element: pageElement(Cards) },
  { path: "statements", element: pageElement(Statements) },
  { path: "notifications", element: pageElement(Inbox) },
  { path: "profile", element: pageElement(Profile) },
  { path: "verification", element: pageElement(KycUpgrade) },
  { path: "security", element: pageElement(Security) },
];
