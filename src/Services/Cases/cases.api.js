import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalDownload, portalPost } from "@/Services/api/portalRequest";

const { CASE } = API_ENDPOINTS;

// { total, action_needed, cases: [{ id, case_number, title, state, last_message, last_message_at, can_reply, ... }] }.
// `state`: "OPEN", "CLOSED" or "" (all). Waiting-for-you cases come first.
export const listCases = async ({ state = "", page = 1, limit = 20 } = {}) =>
  (await portalPost(CASE.LIST, { state, page, limit })).data ?? { total: 0, action_needed: 0, cases: [] };

// The case and its posts, oldest first: { from: STAFF | ME, body, files: [{ path, name }], at }.
export const getCase = async (id) => (await portalPost(CASE.GET, { id })).data;

// One PDF, JPG or PNG (up to 5 MB) -> { path, name } (the file's own name).
export const uploadCaseFile = async (file) => {
  const form = new FormData();
  form.append("file", file);
  return (await portalPost(CASE.UPLOAD, form)).data;
};

// { open, action_needed, support_open, support_limit }: the menu's badge,
// and whether another support case may be opened (zeros for a store user).
export const countCases = async () => (await portalPost(CASE.COUNT, {})).data ?? { open: 0, action_needed: 0, support_open: 0, support_limit: 5 };

// [{ code, label }], the label in the portal's language.
export const listCaseCategories = async () => (await portalPost(CASE.CATEGORIES, {})).rows;

// A support case the merchant opens: { category, title (200), body (4000), files: [{ path, name }] }
// -> the new case with its conversation.
export const openCase = async ({ category, title, body, files }) => (await portalPost(CASE.OPEN, { category, title, body, files })).data;

// Withdraw an open case the merchant opened; `reason` (optional) is for staff only.
export const withdrawCase = async ({ id, reason }) => (await portalPost(CASE.WITHDRAW, { id, ...(reason ? { reason } : {}) })).data;

// A message and/or up to 5 uploaded files ([{ path, name }], as the upload
// answered, so the file keeps its name); resolves to the case with its posts.
export const replyToCase = async ({ id, body, files }) => (await portalPost(CASE.REPLY, { id, body, files })).data;

// A file of one of the merchant's own cases, as a Blob.
export const downloadCaseFile = async (path) => (await portalDownload(CASE.FILE, { path })).blob;

const { DISPUTE } = API_ENDPOINTS;
// Whether a transaction may be disputed: { reasons: [{ code, name }],
// reason_required, can_dispute, window_ends, why_not, why_not_message }.
export const disputeReasons = async (rrn) => (await portalPost(DISPUTE.REASONS, { rrn })).data;
// Dispute a transaction of yours by its RRN: { rrn, reason_code, title, body } -> { id, case_number }.
export const raiseDispute = async ({ rrn, reason_code, title, body }) => (await portalPost(DISPUTE.RAISE, { rrn, reason_code, title, body })).data;
// Disputes others raised about your transactions, paged by the server:
// { total, disputes: [{ id, case_number, status, rrn, txn_type, amount,
// currency_code, txn_at, opened_at, closed_at, outcome, can_respond }] }.
export const listDisputesAgainst = async ({ state = "", page = 1, limit = 20 } = {}) => {
  const reply = (await portalPost(DISPUTE.AGAINST, { state, page, limit })).data ?? {};
  return { total: reply.total ?? 0, items: reply.disputes ?? [] };
};
// Your answer on a dispute against you: a note to staff, with uploaded files.
export const respondToDispute = async ({ id, body, files }) => (await portalPost(DISPUTE.RESPOND, { id, body, files })).data;
