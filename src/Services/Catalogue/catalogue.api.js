import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { CATALOGUE } = API_ENDPOINTS;
// The merchant's products, paged by the server: { items: [{ id, code, name,
// category, unit, parent_id, currency_code, status, price, actions: { edit,
// price_set } }], can_add, total, page, limit } (limit 1-200). `parentsOnly`
// returns only main products, for the parent picker.
export const loadProducts = async ({ search = "", page = 1, limit = 50, parentsOnly = false } = {}) => {
  const data = (await portalPost(CATALOGUE.PRODUCT_LIST, { search, page, limit, ...(parentsOnly && { parents_only: true }) })).data ?? {};
  return { items: data.items ?? [], total: data.total ?? 0, canAdd: data.can_add === true };
};
// Without `id` adds { code, name, category, unit, parent_id,
// currency_code }; with `id` edits { id, name, category, unit, parent_id, active }.
export const saveProduct = async (product) => (await portalPost(product.id ? CATALOGUE.PRODUCT_EDIT : CATALOGUE.PRODUCT_ADD, product)).data;
// A product's prices, newest first: [{ id, product_id, store_id (null = all
// stores), price, valid_from, valid_to (null = open), created_by }].
export const loadPrices = async (product_id) => (await portalPost(CATALOGUE.PRICE_LIST, { product_id })).rows.filter((row) => row?.id != null);
// Owner only: { product_id, store_id (0 = all stores), price, valid_from, valid_to }.
export const setPrice = async (price) => (await portalPost(CATALOGUE.PRICE_SET, price)).data;
