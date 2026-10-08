import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/Redux/store";
import { router } from "@/Router/Router";
import Toast from "@/Components/Common/Toast";
import BrandingLoader from "@/Components/Common/BrandingLoader";
import "@/Utils/I18n/i18n";
import "@/styles.css";
import { initTheme } from "@/Utils/Lib/theme";

initTheme();
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrandingLoader />
      <RouterProvider router={router} />
      <Toast />
    </Provider>
  </React.StrictMode>,
);
