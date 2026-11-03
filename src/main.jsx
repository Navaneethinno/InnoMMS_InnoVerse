import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/Redux/store";
import { router } from "@/Router/Router";
import Toast from "@/Components/Common/Toast";
import EnvironmentBanner from "@/Components/Common/EnvironmentBanner";
import BrandingLoader from "@/Components/Common/BrandingLoader";
import i18n, { loadLanguage } from "@/Utils/I18n/i18n";
import "@/styles.css";
import { initTheme } from "@/Utils/Lib/theme";

initTheme();
// The saved language first, so the first paint is not in English. A failed
// download falls back to English.
const render = () => ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <EnvironmentBanner />
      <BrandingLoader />
      <RouterProvider router={router} />
      <Toast />
    </Provider>
  </React.StrictMode>,
);
void loadLanguage(i18n.language)
  .then(() => i18n.changeLanguage(i18n.language))
  .catch(() => {})
  .finally(render);
