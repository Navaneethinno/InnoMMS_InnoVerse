import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Stores module: stores (with their users, hours and POS profiles/shifts) and
// the terminals placed in them.
const Stores = lazy(() => import("@/Components/Stores/Stores/Stores"));
const Terminals = lazy(() => import("@/Components/Stores/Terminals/Terminals"));
export const storesRoutes = [
  { path: "stores", element: pageElement(Stores) },
  { path: "terminals", element: pageElement(Terminals) },
];
