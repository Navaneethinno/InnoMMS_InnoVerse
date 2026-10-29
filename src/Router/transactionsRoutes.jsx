import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Transactions module: History and Statements.
const History = lazy(() => import("@/Components/Transactions/History/History"));
const Statements = lazy(() => import("@/Components/Transactions/Statements/Statements"));
export const transactionsRoutes = [
  { path: "history", element: pageElement(History) },
  { path: "statements", element: pageElement(Statements) },
];
