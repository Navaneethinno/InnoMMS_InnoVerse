import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/Hooks/Theme/useTheme";
import "react-toastify/dist/ReactToastify.css";
export default function Toast() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      ariaLabel={t("common.notifications")}
      autoClose={5000}
      theme={theme}
    />
  );
}
