import { createBrowserRouter } from "react-router-dom";
import { publicRoutes, authenticatedGroup } from "./index";
import PortalTour from "@/Components/Tour/PortalTour";
export const router = createBrowserRouter([
  { element: <PortalTour />, children: [...publicRoutes, ...authenticatedGroup] },
]);
