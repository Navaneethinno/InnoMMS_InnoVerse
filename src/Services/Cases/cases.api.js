import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalDownload, portalPost } from "@/Services/api/portalRequest";

const { CASE } = API_ENDPOINTS;

// { total, action_needed, cases: [{ id, case_number, title, state, last_message, last_message_at, can_reply, ... }] }.
// `state`: "OPEN", "CLOSED" or "" (all). Waiting-for-you cases come first.
export const listCases = async ({ state = "", page = 1, limit = 20 } = {}) =>
  (await portalPost(CASE.LIST, { state, page, limit })).data ?? { total: 0, action_needed: 0, cases: [] };

// The case and its posts, oldest first: { from: STAFF | ME, body, files: [{ path, name }], at }.
export const getCase = async (id) => (await portalPost(CASE.GET, { id })).data;

// One PDF, JPG or PNG (up to 5 MB) -> { path, name }; the path goes with the reply.
export const uploadCaseFile = async (file) => {
  const form = new FormData();
  form.append("file", file);
  return (await portalPost(CASE.UPLOAD, form)).data;
};

// A message and/or up to 5 uploaded files; resolves to the case with its posts.
export const replyToCase = async ({ id, body, files }) => (await portalPost(CASE.REPLY, { id, body, files })).data;

// A file of one of the merchant's own cases, as a Blob.
export const downloadCaseFile = async (path) => (await portalDownload(CASE.FILE, { path })).blob;
