import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { STORE } = API_ENDPOINTS;
// A list call answers one row per item, or one item holding the list.
const listOf = (rows, key) =>
  rows.length === 1 && Array.isArray(rows[0]?.[key])
    ? rows[0][key]
    : rows.filter((row) => row?.id != null);

// The merchant's stores (a store user: only its own): [{ id, code, name,
// address, province, phone_number, latitude, longitude, status (PENDING |
// ACTIVE | REJECTED | INACTIVE), decision_note, created_at, decided_at }].
export const loadStores = async () =>
  listOf((await portalPost(STORE.list)).rows, "stores");
// Owner only. `store` without `id` adds one (it waits for the bank), with `id`
// edits it (the code cannot change; a rejected store goes back to the bank).
export const saveStore = async (store) =>
  (await portalPost(store.id ? STORE.edit : STORE.add, store)).data;
export const closeStore = (id) => portalPost(STORE.close, { id });
export const reopenStore = (id) => portalPost(STORE.reopen, { id });

// Store managers and cashiers: [{ id, role (STORE_MANAGER | CASHIER), name,
// phone_number, status, refund_limit, stores: [...], last_sign_in_at }].
export const loadStoreUsers = async () =>
  listOf((await portalPost(STORE.users)).rows, "users");
// Owner only. Without `id` adds a user (with their first PIN), with `id` edits
// them (role, name, stores, refund limit, ACTIVE/INACTIVE).
export const saveStoreUser = async (user) =>
  (await portalPost(user.id ? STORE.user_edit : STORE.user_add, user)).data;
// Owner only: a new PIN for a user who forgot theirs or is locked out.
export const setStoreUserPin = (id, pin) =>
  portalPost(STORE.user_pin, { id, pin });
