import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Messages module: the notification inbox and cases.
const Inbox = lazy(() => import("@/Components/Messages/Notifications/Inbox"));
const Cases = lazy(() => import("@/Components/Messages/Cases/Cases"));
export const messagesRoutes = [
  { path: "notifications", element: pageElement(Inbox) },
  { path: "cases", element: pageElement(Cases) },
];
