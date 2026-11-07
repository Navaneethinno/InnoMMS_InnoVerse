import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { CATALOGUE } = API_ENDPOINTS;
// A list call answers one row per item, or one item holding the list.
const listOf = (rows, key) => (rows.length === 1 && Array.isArray(rows[0]?.[key]) ? rows[0][key] : rows.filter((row) => row?.id != null));

// The merchant's products: [{ id, code, name, category, unit, parent_id,
// currency_code, active }]. `search` is matched by the server.
export const loadProducts = async ({ search = "" } = {}) => listOf((await portalPost(CATALOGUE.PRODUCT_LIST, { search })).rows, "products");
// Owner only. Without `id` adds { code, name, category, unit, parent_id,
// currency_code }; with `id` edits { id, name, category, unit, parent_id, active }.
export const saveProduct = async (product) => (await portalPost(product.id ? CATALOGUE.PRODUCT_EDIT : CATALOGUE.PRODUCT_ADD, product)).data;
// A product's prices: [{ id, store_id (0 = all stores), price, valid_from, valid_to }].
export const loadPrices = async (product_id) => listOf((await portalPost(CATALOGUE.PRICE_LIST, { product_id })).rows, "prices");
// Owner only: { product_id, store_id (0 = all stores), price, valid_from, valid_to }.
export const setPrice = async (price) => (await portalPost(CATALOGUE.PRICE_SET, price)).data;
