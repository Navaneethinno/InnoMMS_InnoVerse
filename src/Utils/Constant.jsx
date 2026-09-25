import { lifecycleEndpoints } from "@/Services/api/lifecycleEndpoints";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://etakuapi.innovitegrasuite.com";
// Host only: every path below is the FULL route. Admin routes start with
// /config/, masters with /master/ or /master_config/ (never /config), health
// is /health. A base ending in /config turns every master path into
// /config/master/... and 404s it. Live channels are host + list path + /live.

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");
export const AUTH_BASIC_USERNAME = import.meta.env.VITE_AUTH_BASIC_USERNAME || "webadmin";
export const AUTH_BASIC_PASSWORD = import.meta.env.VITE_AUTH_BASIC_PASSWORD;
export const NON_LOGIN_APIS_ENABLED = import.meta.env.VITE_ENABLE_NON_LOGIN_APIS === "true";

// Numeric `status` meaning "Draft" (saved, never submitted). Overridable via env
// in case the backend renumbers it.
export const DRAFT_STATUS_CODE = Number(import.meta.env.VITE_DRAFT_STATUS_CODE ?? 9);

// Every backend route, in one place. Grouped to mirror the sidebar (module ->
// parent menu -> menu), so "where is this page's API" is answered by nav
// position. Maker-checker entities use lifecycleEndpoints(base) to get their
// 13 routes (list, get, get_active, add, edit, submit, auth, deauth, delete,
// delete_auth, deactivate, reactivate, audit, pending).
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/config/user/login",
    REFRESH_TOKEN: "/config/user/refresh_token",
    CHANGE_PASSWORD: "/config/user/change_password",
  },

  HEALTH: "/health",

  // Signed-in user's own record + password policy (header: My profile,
  // Change password).
  USER_MANAGEMENT: {
    USER: {
      GET: "/config/user/get",
      PASSWORD_POLICY_LIST: "/config/user/password_policy/list",
    },
  },

  // Read-only platform reference lookups (/master/*), used for dropdowns.
  MASTER: {
    ACTION_LIST: "/master/action",
    STATUS_LIST: "/master/status",
    MODULE_LIST: "/master/module",
    MENU_LIST: "/master/menu",
    MENU_ACTION_LIST: "/master/menu_action",
    CHANNEL_LIST: "/master/channel",
    ACCT_PROD_TYPE_LIST: "/master/acct_prod_type",
    ACCT_OPERATION_MODE_LIST: "/master/acct_operation_mode",
    ACCT_DORMANCY_ACTION_LIST: "/master/acct_dormancy_action",
    ACCT_SEQUENCE_LIST: "/master/acct_sequence",
    TRANSACTION_LIST: "/master/transaction",
    FREQUENCY_LIST: "/master/frequency",
    KYC_PROCESS_LIST: "/master/kyc_process",
    PARTY_TYPE_LIST: "/master/party_type",
    INSTITUTION_TYPE_LIST: "/master/institution_type",
    OWNERSHIP_LIST: "/master/ownership",
    RESIDENCY_TYPE_LIST: "/master/residency_type",
    COUNTRY_LIST: "/master/country",
    CURRENCY_LIST: "/master/currency",
    LANGUAGE_LIST: "/master/language",
    // Confirmed live 2026-09: POST /master/timezone (no trailing "/list",
    // same as every other Master endpoint above), paginated — {page, limit}
    // in the body, {id, name, status, status_name} per record.
    TIMEZONE_LIST: "/master/timezone",
  },

  // Settings > Master pages above (District, Province, ...) are full
  // maker-checker CRUD entities served under /master_config/*, distinct
  // from the read-only /master/* reference lookups above — the sidebar
  // lists them under the same "Master" group but they hit a different base

  // --- Example module (sample; delete or replace with your first real module)
  // Sidebar: Example > Master > Category
  EXAMPLE: {
    CATEGORY: lifecycleEndpoints("/master_config/category"),
  },
};
