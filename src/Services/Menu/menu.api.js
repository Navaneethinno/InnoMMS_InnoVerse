import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

// The signed-in menu and what this merchant may use: { menu: [{ key, path,
// label (in the API language), icon, order }], features: { cards: true, ... } }.
export async function loadMenu() {
  const { data } = await portalPost(API_ENDPOINTS.MENU);
  return { menu: data?.menu ?? [], features: data?.features ?? null };
}
