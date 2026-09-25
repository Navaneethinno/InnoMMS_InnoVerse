import { apiRequest } from "@/Services/api/request";

export { lifecycleEndpoints } from "@/Services/api/lifecycleEndpoints";

// Deauthorize requires a narration; send "UNDEFINED" rather than nothing.
const deauthPayload = (payload = {}) => ({ id: payload.id, narration: payload.narration || "UNDEFINED" });

// list() takes { page, limit, filter, sort_by }:
//   filter:  all | active | pending | draft | inactive  (the status tabs)
//   sort_by: desc (newest change first, default) | asc
// The server filters and sorts ALL records before paging; the response echoes
// filter/sort_by and pagination.totalRecords counts only that filter.
export const lifecycleApi = (endpoints) => ({
  list: (payload = { page: 1, limit: 10 }) => apiRequest(endpoints.LIST, payload),
  get: (payload) => apiRequest(endpoints.GET, payload),
  getActive: (payload = { view: "dropdown" }) => apiRequest(endpoints.GET_ACTIVE, payload),
  add: (payload) => apiRequest(endpoints.ADD, payload),
  edit: (payload) => apiRequest(endpoints.EDIT, payload),
  submit: (payload) => apiRequest(endpoints.SUBMIT, payload),
  auth: (payload) => apiRequest(endpoints.AUTH, payload),
  deauth: (payload) => apiRequest(endpoints.DEAUTH, deauthPayload(payload)),
  delete: (payload) => apiRequest(endpoints.DELETE, payload),
  deleteAuth: (payload) => apiRequest(endpoints.DELETE_AUTH, payload),
  deactivate: (payload) => apiRequest(endpoints.DEACTIVATE, payload),
  reactivate: (payload) => apiRequest(endpoints.REACTIVATE, payload),
  audit: (payload) => apiRequest(endpoints.AUDIT, payload),
  pending: (payload) => apiRequest(endpoints.PENDING, payload),
});
