import { apiRequest } from "@/Services/api/request";
import { API_ENDPOINTS } from "@/Utils/Constant";

const USER = API_ENDPOINTS.USER_MANAGEMENT.USER;

// The signed-in user's own account calls (header: My profile, Change password).
export const accountApi = {
  // { user_id } -> the user's full record (name, email, mobile, role, institution...)
  getUser: (payload) => apiRequest(USER.GET, payload),
  passwordPolicies: (payload = {}) => apiRequest(USER.PASSWORD_POLICY_LIST, payload),
};
