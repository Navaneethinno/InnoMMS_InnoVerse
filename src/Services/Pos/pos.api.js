import { API_ENDPOINTS } from "@/Utils/Constant";
import { portalPost } from "@/Services/api/portalRequest";

const { POS_PROFILE, POS_SHIFT } = API_ENDPOINTS;
// Each list answers one row per item.
const listOf = async (path) => (await portalPost(path)).rows;

// What a terminal user may do: [{ txn_type, direction (CREDIT | DEBIT | NONE),
// amounts, counted, description }]. A type whose `amounts` / `counted` is
// false takes no amount / count limits.
export const loadTxnTypes = () => listOf(POS_PROFILE.TXN_TYPES);
// Terminal profiles: [{ id, name, currency_code, currency_decimals,
// daily_debit_limit, daily_credit_limit (null: no limit), manager_assignable,
// status, transactions: [{ txn_type, direction, max_amount, daily_count,
// daily_amount }], user_count }]. A store manager gets the assignable ones.
export const loadPosProfiles = () => listOf(POS_PROFILE.LIST);
// Owner only. Without `id` adds one; with `id` edits it (transactions replace).
export const savePosProfile = async (profile) =>
  (await portalPost(profile.id ? POS_PROFILE.EDIT : POS_PROFILE.ADD, profile)).data;
export const setPosProfileActive = (id, active) =>
  portalPost(POS_PROFILE.STATUS, { id, active });
// Only one no user holds (user_count 0); otherwise pos.profile_in_use.
export const deletePosProfile = (id) => portalPost(POS_PROFILE.DELETE, { id });

// Shifts: [{ id, name, status, open_now, user_count, windows: [{ days,
// opens, closes }] }], the same rules as a store's opening hours.
export const loadPosShifts = () => listOf(POS_SHIFT.LIST);
export const savePosShift = async (shift) =>
  (await portalPost(shift.id ? POS_SHIFT.EDIT : POS_SHIFT.ADD, shift)).data;
export const setPosShiftActive = (id, active) =>
  portalPost(POS_SHIFT.STATUS, { id, active });
// Only one no user holds (user_count 0); otherwise pos.shift_in_use.
export const deletePosShift = (id) => portalPost(POS_SHIFT.DELETE, { id });

// Profile templates the bank offers: [{ code, name, description, currency_code,
// daily_debit_limit, daily_credit_limit, transactions: [...] }].
export const loadPosTemplates = () => listOf(POS_PROFILE.TEMPLATES);
// A new profile copied from a template: { template_code, name, currency_code }.
export const posProfileFromTemplate = async (body) => (await portalPost(POS_PROFILE.FROM_TEMPLATE, body)).data;
