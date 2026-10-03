import { Navigate } from "react-router-dom";
import { getAccessToken } from "@/Services/api/authStorage";
import { merchantSession } from "@/Services/Merchant/merchantAccount.api";
export function ProtectRoute({ children }) {
  const accessToken = getAccessToken();
  if (accessToken) return children;
  if (merchantSession.read()?.access_token) return <Navigate to="/account" replace />;
  return <Navigate to="/login" replace />;
}
