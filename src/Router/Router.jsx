import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/Components/Layout/AppLayout";
import { RouteError } from "@/Components/Common/RouteError";
import { ProtectRoute } from "./ProtectRoute";
import { dashboardRoutes, exampleRoutes, publicRoutes } from "./index";
import { MerchantAccountPage } from "@/Pages/Merchant/MerchantAccountPage";
import { merchantSession } from "@/Services/Merchant/merchantAccount.api";
import { Navigate } from "react-router-dom";
function MerchantAccountRoute() {
  return merchantSession.read()?.access_token ? <MerchantAccountPage /> : <Navigate to="/login" replace />;
}
export const appRouter = createBrowserRouter([
  ...publicRoutes.map((route) => ({ errorElement: <RouteError />, ...route })),
  { path: "/account", element: <MerchantAccountRoute />, errorElement: <RouteError /> },
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    errorElement: <RouteError />,
    children: [...dashboardRoutes, ...exampleRoutes],
  },
]);
export default appRouter;
