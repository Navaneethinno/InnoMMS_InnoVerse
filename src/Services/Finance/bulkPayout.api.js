import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { BULK_PAYOUT } = API_ENDPOINTS;

// Merchant bulk payouts: the admin calls without inst_profile_id; the
// merchant's own wallet pays. list { batch_status?, search?, page, page_size }
// -> { items, total, page, page_size }; get { id } -> the batch with items[]
// and actions; auth { id, pin, narration? }.
export const bulkPayoutTemplate = async () => (await portalPost(BULK_PAYOUT.TEMPLATE, {})).data;
export const bulkPayoutCheck = async (body) => (await portalPost(BULK_PAYOUT.CHECK, body)).data;
export const bulkPayoutAdd = (body) => portalPost(BULK_PAYOUT.ADD, body);
export const bulkPayoutList = async (body) => {
  const data = (await portalPost(BULK_PAYOUT.LIST, body)).data ?? {};
  return { items: data.items ?? [], total: data.total ?? 0 };
};
export const bulkPayoutGet = async (id) => (await portalPost(BULK_PAYOUT.GET, { id })).data;
export const bulkPayoutVerb = (verb, body) => portalPost(BULK_PAYOUT[verb.toUpperCase()], body);
export const bulkPayoutResultFile = async (id) => (await portalPost(BULK_PAYOUT.RESULT_FILE, { id })).data;
