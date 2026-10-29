import { lazy } from "react";
import { pageElement } from "./routeSupport";
const Dashboard = lazy(() => import("@/Components/Dashboard/Dashboard"));
export const dashboardRoutes = [{ path: "dashboard", element: pageElement(Dashboard) }];
