import { lazy } from "react";
import { pageElement } from "./routeSupport";

// App-level pages that are not sidebar menus: dashboard, and the header's
// notifications / my profile / change password.
const DashboardPage = lazy(() => import("@/Pages/Dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const NotificationsPage = lazy(() => import("@/Pages/Notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const MyProfilePage = lazy(() => import("@/Pages/Header/MyProfilePage").then((m) => ({ default: m.MyProfilePage })));
const ChangePasswordPage = lazy(() => import("@/Pages/Header/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage })));

export const dashboardRoutes = [
  { path: "/", element: pageElement(DashboardPage) },
  { path: "/dashboard", element: pageElement(DashboardPage) },
  { path: "/notifications", element: pageElement(NotificationsPage) },
  { path: "/my-profile", element: pageElement(MyProfilePage) },
  { path: "/change-password", element: pageElement(ChangePasswordPage) },
];
