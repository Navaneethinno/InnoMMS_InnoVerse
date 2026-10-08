import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPin, sendCode } from "@/Services/Auth/auth.api";
import { usePortalPolicy } from "@/Hooks/Auth/usePortalPolicy";
import AuthCard from "./AuthCard";
import CodeFlow from "./CodeFlow";

// A forgotten PIN where the portal signs in with a PIN: a code to the
// merchant's phone, then the new PIN typed twice. It also lifts a sign-in lock.
export default function ForgotPin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policy = usePortalPolicy();
  // A portal that signs in with a password has no PIN to forget here.
  if (policy.status === "ready" && !policy.login.methods.includes("PIN")) return <Navigate to="/forgot-password" replace />;
  return (
    <AuthCard title={t("auth.forgotPinTitle", { defaultValue: "Reset your PIN" })} description={t("auth.forgotPinDescription", { defaultValue: "We will send a code to your mobile number. Enter it with the new PIN you want to use." })}>
      <CodeFlow
        withPin
        withPassword={false}
        loginAsPhone
        pinLabel={t("auth.newPin")}
        askCode={(loginId) => sendCode(loginId, "RESET_PIN")}
        submit={forgotPin}
        submitLabel={t("cards.pinConfirm.reset")}
        onDone={() => navigate("/login", { replace: true })}
      />
    </AuthCard>
  );
}
