import { Navigate, useLocation } from "react-router-dom";
import { useSessionGuard } from "@/Hooks/Auth/useSessionGuard";
export default function ProtectRoute({ children }) {
  const location = useLocation();
  const signedIn = useSessionGuard();
  return signedIn ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
