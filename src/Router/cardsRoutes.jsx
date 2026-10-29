import { lazy } from "react";
import { pageElement } from "./routeSupport";
const Cards = lazy(() => import("@/Components/Cards/Cards"));
export const cardsRoutes = [{ path: "cards", element: pageElement(Cards) }];
