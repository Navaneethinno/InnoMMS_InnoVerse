import AppLayout from "@/Components/Layout/AppLayout";
import ProtectRoute from "@/Components/Layout/ProtectRoute";
import { dashboardRoutes } from "./dashboardRoutes";
export const authenticatedGroup = [
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    children: [...dashboardRoutes],
  },
];
