import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword, sendCode } from "@/Services/Auth/auth.api";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import AuthCard from "./AuthCard";
import CodeFlow from "./CodeFlow";

// A forgotten password: code to the merchant's contact, then a new one.
// Resetting ends every session and unlocks sign-in.
export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policy = usePortalPolicy();
  // A portal that signs in with a PIN has no password to reset: its PIN is reset instead.
  if (policy.status === "ready" && !policy.login.methods.includes("PASSWORD")) return <Navigate to="/forgot-pin" replace />;
  return (
    <AuthCard title={t("auth.forgotTitle")} description={t("auth.forgotDescription")}>
      <CodeFlow
        askCode={(loginId) => sendCode(loginId, "RESET_PASSWORD")}
        submit={resetPassword}
        submitLabel={t("auth.resetPassword")}
        onDone={() => navigate("/login", { replace: true })}
      />
    </AuthCard>
  );
}
