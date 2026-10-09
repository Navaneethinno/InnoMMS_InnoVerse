import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

// The signed-in menu and what this merchant may use: { menu: [{ key, path,
// label (in the API language), icon, order }], features: { cards: true, ... } }.
export async function loadMenu() {
  const { data } = await portalPost(API_ENDPOINTS.MENU);
  // `roles` lets the portal build an agent's or a store user's screens.
  return { menu: data?.menu ?? [], features: data?.features ?? null, ...(Array.isArray(data?.roles) ? { roles: data.roles } : {}) };
}
