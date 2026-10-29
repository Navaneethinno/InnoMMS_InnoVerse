import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Finance module: term deposits and loans (the merchant's own).
const Deposits = lazy(() => import("@/Components/Finance/Deposits/Deposits"));
const Loans = lazy(() => import("@/Components/Finance/Loans/Loans"));
export const financeRoutes = [
  { path: "deposits", element: pageElement(Deposits) },
  { path: "loans", element: pageElement(Loans) },
];
