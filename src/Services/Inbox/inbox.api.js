import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { INBOX } = API_ENDPOINTS;

// { items: [{ id, event_code, title, body, read, read_at, created_at }], total, unread }
export const listNotifications = async ({ page = 1, limit = 20, unreadOnly = false } = {}) =>
  (await portalPost(INBOX.LIST, { page, limit, unread_only: unreadOnly })).data ?? { items: [], total: 0, unread: 0 };

// `ids` or `all`; resolves to { marked, unread }.
export const markNotificationsRead = async ({ ids, all = false }) => (await portalPost(INBOX.READ, all ? { all: true } : { ids })).data;

export const loadUnreadCount = async () => (await portalPost(INBOX.UNREAD_COUNT)).data?.unread ?? 0;
