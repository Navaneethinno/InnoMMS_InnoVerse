import { lazy } from "react";
import { pageElement } from "../routeSupport";

// Sidebar: Example > Master > Category.
// The sidebar navigates to /<slug>/<uuid>, where slug = menu_name lowercased
// with spaces removed ("Category" -> "category"). Register both forms.
const Category = lazy(() => import("@/Components/Example/Master/Category").then((m) => ({ default: m.Category })));

export const categoryRoutes = [
  { path: "category", element: pageElement(Category) },
  { path: "category/:id", element: pageElement(Category) },
];
