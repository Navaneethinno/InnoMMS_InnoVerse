import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { hasSession, clearAuthSession } from "@/Services/api/authStorage";
import { sessionCleared } from "@/Redux/slices/authSlice";
export default function ProtectRoute({ children }) {
  const location = useLocation();
  const dispatch = useDispatch();
  const authenticated = useSelector((state) => state.auth.authenticated);
  const [valid, setValid] = useState(() => hasSession());
  useEffect(() => {
    const check = () => {
      // Signed in while the refresh token works: the access token (15
      // minutes) is renewed from it by the API client.
      const current = hasSession();
      setValid(current);
      if (!current) {
        clearAuthSession();
        dispatch(sessionCleared());
      }
    };
    const expire = () => {
      clearAuthSession();
      check();
    };
    check();
    const timer = window.setInterval(check, 10000);
    window.addEventListener("merchant:session-expired", expire);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("merchant:session-expired", expire);
      window.removeEventListener("focus", check);
    };
  }, [dispatch, authenticated]);
  return valid && hasSession() ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}
