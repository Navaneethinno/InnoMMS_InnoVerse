import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";
import { LAYOUT_VERSION } from "@/Components/Dashboard/layout/gridLayout";

// The merchant's dashboard layout, kept by the server. `layout_get` answers
// { layout (null until one is saved), widgets: the ids this merchant may
// place }; `layout_save` takes [{ id, span, x, y, h }] (the server keeps the
// extra fields), or null to go back to the default.
export const DASHBOARD_KEY = "home";
const { LAYOUT_GET, LAYOUT_SAVE } = API_ENDPOINTS.DASHBOARD;

export const dashboardApi = {
  getLayout: async () => (await portalPost(LAYOUT_GET, { dashboard_key: DASHBOARD_KEY })).data,
  saveLayout: async (layout) => (await portalPost(LAYOUT_SAVE, { dashboard_key: DASHBOARD_KEY, layout, ...(layout ? { layout_version: LAYOUT_VERSION } : {}) })).data,
};
