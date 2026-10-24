import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { POS_PROFILE, POS_SHIFT } = API_ENDPOINTS;
// Each list answers one row per item.
const listOf = async (path) => (await portalPost(path)).rows;

// What a terminal user may do: [{ txn_type, direction (CREDIT | DEBIT | NONE),
// amounts, counted, description }]. A type whose `amounts` / `counted` is
// false takes no amount / count limits.
export const loadTxnTypes = () => listOf(POS_PROFILE.txn_types);
// Terminal profiles: [{ id, name, currency_code, currency_decimals,
// daily_debit_limit, daily_credit_limit (null: no limit), manager_assignable,
// status, transactions: [{ txn_type, direction, max_amount, daily_count,
// daily_amount }], user_count }]. A store manager gets the assignable ones.
export const loadPosProfiles = () => listOf(POS_PROFILE.list);
// Owner only. Without `id` adds one; with `id` edits it (transactions replace).
export const savePosProfile = async (profile) =>
  (await portalPost(profile.id ? POS_PROFILE.edit : POS_PROFILE.add, profile)).data;
export const setPosProfileActive = (id, active) =>
  portalPost(POS_PROFILE.status, { id, active });
// Only one no user holds (user_count 0); otherwise pos.profile_in_use.
export const deletePosProfile = (id) => portalPost(POS_PROFILE.delete, { id });

// Shifts: [{ id, name, status, open_now, user_count, windows: [{ days,
// opens, closes }] }], the same rules as a store's opening hours.
export const loadPosShifts = () => listOf(POS_SHIFT.list);
export const savePosShift = async (shift) =>
  (await portalPost(shift.id ? POS_SHIFT.edit : POS_SHIFT.add, shift)).data;
export const setPosShiftActive = (id, active) =>
  portalPost(POS_SHIFT.status, { id, active });
// Only one no user holds (user_count 0); otherwise pos.shift_in_use.
export const deletePosShift = (id) => portalPost(POS_SHIFT.delete, { id });
