import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { TERMINAL } = API_ENDPOINTS;

// The POS terminals the bank assigned to this merchant (a store manager: its
// stores' only), in the admin shape: tid, type, make, model, store, name,
// status, last seen, users allowed, block_requested_at, ...
export const loadTerminals = async () => {
  const { rows } = await portalPost(TERMINAL.LIST);
  const inner =
    rows.length === 1 && Array.isArray(rows[0]?.terminals ?? rows[0]?.items)
      ? (rows[0].terminals ?? rows[0].items)
      : null;
  return inner ?? rows.filter((row) => row?.id != null);
};
// Owner only: place it in an Active store and name it; `userIds` limits who may
// sign in on it (empty: every user of that store; the owner always can).
export const setupTerminal = ({ id, storeId, name, userIds = [] }) =>
  portalPost(TERMINAL.SETUP, {
    id,
    store_id: storeId,
    name,
    user_ids: userIds,
  });
// Owner only: ask the bank to block it (lost, stolen, broken).
export const requestTerminalBlock = (id, reason) =>
  portalPost(TERMINAL.BLOCK_REQUEST, { id, reason });
