import { lazy } from "react";
import { pageElement } from "./routeSupport";
// Payments module: Send money, M-Pesa / e-Mola / mKesh, bank transfer,
// airtime, CREDELEC, bills and the merchant's Paga-Daki code.
const Send = lazy(() => import("@/Components/Payments/Send/Send"));
const MobileMoney = lazy(() => import("@/Components/Payments/MobileMoney/MobileMoney"));
const BankTransfer = lazy(() => import("@/Components/Payments/BankTransfer/BankTransfer"));
const Airtime = lazy(() => import("@/Components/Payments/Airtime/Airtime"));
const Electricity = lazy(() => import("@/Components/Payments/Electricity/Electricity"));
const Bills = lazy(() => import("@/Components/Payments/Bills/Bills"));
const MyCode = lazy(() => import("@/Components/Payments/MyCode/MyCode"));
export const paymentsRoutes = [
  { path: "send", element: pageElement(Send) },
  { path: "mobile-money", element: pageElement(MobileMoney) },
  { path: "bank-transfer", element: pageElement(BankTransfer) },
  { path: "airtime", element: pageElement(Airtime) },
  { path: "electricity", element: pageElement(Electricity) },
  { path: "bills", element: pageElement(Bills) },
  { path: "my-code", element: pageElement(MyCode) },
];
