import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { activateAccess, sendCode } from "@/Services/Auth/auth.api";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import AuthCard from "./AuthCard";
import CodeFlow from "./CodeFlow";

// First-time access for an approved merchant: code to their contact, then the
// password and transaction PIN they choose.
export default function ActivateAccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policy = usePortalPolicy();
  // Where the portal signs in with a PIN there is no activation step: the PIN chosen at sign-up is the sign-in PIN.
  if (policy.status === "ready" && !policy.login.methods.includes("PASSWORD")) return <Navigate to="/login" replace />;
  return (
    <AuthCard title={t("auth.activateTitle")} description={t("auth.activateDescription")}>
      <CodeFlow
        withPin
        askCode={(loginId) => sendCode(loginId, "ACTIVATE")}
        submit={activateAccess}
        submitLabel={t("auth.activate")}
        onDone={() => navigate("/login", { replace: true })}
      />
    </AuthCard>
  );
}
