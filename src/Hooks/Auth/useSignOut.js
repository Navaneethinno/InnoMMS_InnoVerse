import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "@/Services/api/authStorage";
import { logout } from "@/Services/Auth/auth.api";
import { sessionCleared } from "@/Redux/slices/authSlice";

// Ends the session on the server too (this device only, or every device with
// `{ all: true }`); whatever the answer, the tokens are cleared and the
// customer goes to the sign-in screen.
export function useSignOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return useCallback(
    async ({ all = false } = {}) => {
      await logout({ all }).catch(() => {});
      clearAuthSession();
      dispatch(sessionCleared());
      navigate("/login", { replace: true });
    },
    [dispatch, navigate],
  );
}
