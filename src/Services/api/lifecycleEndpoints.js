// Every maker-checker entity exposes the same 13 routes under one base path.
// Build them once instead of typing 13 strings per entity:
//
//   CATEGORY: lifecycleEndpoints("/master_config/category"),
//   ...
//   export const categoryApi = lifecycleApi(API_ENDPOINTS.EXAMPLE.CATEGORY);
// No imports on purpose: Utils/Constant.jsx uses this, and request.js
// imports Constant, so importing anything here would create a cycle.
export const lifecycleEndpoints = (base) => ({
  LIST: `${base}/list`,
  GET: `${base}/get`,
  GET_ACTIVE: `${base}/get_active`,
  ADD: `${base}/add`,
  EDIT: `${base}/edit`,
  SUBMIT: `${base}/submit`,
  AUTH: `${base}/auth`,
  DEAUTH: `${base}/deauth`,
  DELETE: `${base}/delete`,
  DELETE_AUTH: `${base}/delete_auth`,
  DEACTIVATE: `${base}/deactivate`,
  REACTIVATE: `${base}/reactivate`,
  AUDIT: `${base}/audit`,
  PENDING: `${base}/pending`,
});

