import AppLayout from "@/Components/Layout/AppLayout";
import ProtectRoute from "@/Components/Layout/ProtectRoute";
import { dashboardRoutes } from "./dashboardRoutes";
import { paymentsRoutes } from "./paymentsRoutes";
import { transactionsRoutes } from "./transactionsRoutes";
import { cardsRoutes } from "./cardsRoutes";
import { financeRoutes } from "./financeRoutes";
import { messagesRoutes } from "./messagesRoutes";
import { accountRoutes } from "./accountRoutes";
import { agentsRoutes } from "./agentsRoutes";
import { storesRoutes } from "./storesRoutes";
// The signed-in area: one route list per sidebar module (see
// Utils/Config/routeConfig.js for the menu keys each module's screens answer to).
export const authenticatedGroup = [
  {
    element: (
      <ProtectRoute>
        <AppLayout />
      </ProtectRoute>
    ),
    children: [
      ...dashboardRoutes,
      ...paymentsRoutes,
      ...transactionsRoutes,
      ...cardsRoutes,
      ...financeRoutes,
      ...messagesRoutes,
      ...accountRoutes,
      ...agentsRoutes,
      ...storesRoutes,
    ],
  },
];
