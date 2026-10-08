import { createBrowserRouter } from "react-router-dom";
import { publicRoutes, authenticatedGroup } from "./index";
export const router = createBrowserRouter([
  { children: [...publicRoutes, ...authenticatedGroup] },
]);
