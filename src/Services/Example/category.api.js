import { lifecycleApi } from "@/Services/api/lifecycleApi";
import { API_ENDPOINTS } from "@/Utils/Constant";

// One line per maker-checker entity: all 13 routes from lifecycleApi.
export const categoryApi = lifecycleApi(API_ENDPOINTS.EXAMPLE.CATEGORY);
