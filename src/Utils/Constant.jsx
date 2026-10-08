/**
 * Backend: the customer-portal API ("Customer web: onboarding API"). It is a
 * separate service from the admin panel's API, so VITE_API_BASE_URL must
 * point at the customer-portal host (the host root,
 * https://etakuapi.innovitegrasuite.com). Every call is a POST with a JSON
 * body (only the file upload is multipart). No login and no token: one fixed
 * Basic credential (VITE_PORTAL_AUTHORIZATION, the full header value) on
 * every call; the admin panel's credential and admin tokens are NOT
 * accepted.
 * The portal has no logged-in user, so it must say which bank the customer
 * onboards with: VITE_INST_PROFILE_ID is sent as `inst_profile_id` on
 * `options` and `add`. The other calls work from the onboarding's
 * `reference_id`.
 * No customer login/dashboard spec has been supplied yet, so those paths
 * stay null below. Never add a path here that is not confirmed by the real
 * backend spec. Keep groups in customer navigation order; all domain URLs
 * belong here.
 */
// An older value that still ends in /merchant/web is accepted and trimmed,
// since every path below now carries its own /merchant/... prefix.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/merchant\/(web|app)$/, "");
// Public files (country flags) are served at the API host's root
// (`/master/file/<path>`). VITE_ASSET_BASE_URL overrides the API host.
export const ASSET_BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL).replace(/\/+$/, "");
// A stored path (relative to the server's assets/ folder) passed through
// unchanged, as the API requires.
export const publicFileUrl = (path) => (path ? `${ASSET_BASE_URL}/master/file/${path}` : "");
export const PORTAL_AUTHORIZATION = import.meta.env.VITE_PORTAL_AUTHORIZATION || "";
// The digital product this portal runs under (its id), sent as
// X-Digital-Product-Id on every call: the account opened at approval is of
// this product's account type. Left out, the institution's only Active
// digital product is used. Each deployment (web, app) sets its own.
export const DIGITAL_PRODUCT_ID = import.meta.env.VITE_DIGITAL_PRODUCT_ID || "";
export const INST_PROFILE_ID = Number(import.meta.env.VITE_INST_PROFILE_ID) || null;
// One onboarding flow's calls: /customer/{kind}/web/{call}, kind being
// `individual` (a person) or `corporate` (a company).
const onboardingEndpoints = (kind) => {
  const path = (call) => `/merchant/${kind}/web/${call}`;
  return {
    OPTIONS: path("options"),
    ADD: path("add"),
    RESUME: path("resume"),
    GET: path("get"),
    NEXT: path("next"),
    BACK: path("back"),
    UPLOAD: path("upload"),
    FILE: path("file"),
    SUBMIT: path("submit"),
    DISCARD: path("discard"),
    RESPOND: path("respond"),
    RESPOND_UPLOAD: path("respond_upload"),
    // A button on a checkpoint screen the server acts on (GUARDIAN_REQUEST).
    ACTION: path("action"),
  };
};
// Signed-in customer calls: /customer/web/auth/{call} and
// /customer/web/account/{call} (the app uses /customer/app/..., same calls).
const channelPath = (group) => (call) => `/merchant/web/${group}/${call}`;
const authPath = channelPath("auth");
const accountPath = channelPath("account");
const cardPath = channelPath("card");
const inboxPath = channelPath("notification");
const statementPath = channelPath("statement");
const dashboardPath = channelPath("dashboard");
const profilePath = channelPath("profile");
const kycPath = channelPath("kyc");
export const API_ENDPOINTS = {
  // WebSocket path (the host is API_BASE_URL with ws/wss).
  LIVE: "/merchant/web/live",
  // The platform's languages (before and after sign-in).
  LANGUAGE: "/merchant/web/language",
  // The platform's public key: passwords, PINs and codes are sealed with it
  // before they leave the browser (see Services/api/credentialSeal.js).
  CREDENTIAL_KEY: "/auth/public_key",
  AUTH: {
    OTP: authPath("otp"),
    ACTIVATE: authPath("activate"),
    LOGIN: authPath("login"),
    REFRESH_TOKEN: authPath("refresh"),
    ME: authPath("me"),
    LOGOUT: authPath("logout"),
    PASSWORD_RESET: authPath("password_reset"),
    PASSWORD_CHANGE: authPath("password_change"),
    PIN_CHANGE: authPath("pin_change"),
    // Banks with two PINs: create the transaction PIN, and change the sign-in PIN.
    PIN_SET: authPath("pin_set"),
    SIGNIN_PIN_CHANGE: authPath("signin_pin_change"),
    PIN_RESET_START: authPath("pin_reset_start"),
    PIN_RULES: authPath("pin_rules"),
    SESSIONS: authPath("sessions"),
    SESSION_END: authPath("session_end"),
    POLICY: authPath("policy"),
    PIN_FORGOT: authPath("pin_forgot"),
    PIN_RESET: authPath("pin_reset"),
  },
  ACCOUNT: {
    WALLETS: accountPath("wallets"),
    PAYEE: accountPath("payee"),
    QUOTE: accountPath("quote"),
    SEND: accountPath("send"),
    HISTORY: accountPath("history"),
    TRANSACTION: accountPath("transaction"),
    RECEIPT: accountPath("receipt"),
    LIMITS: accountPath("limits"),
    SUMMARY: accountPath("summary"),
    TXN_TYPES: accountPath("txn_types"),
    HISTORY_EXPORT: accountPath("history_export"),
    // Money sent to a number that is not a customer yet, waiting for them.
    PHONE_TRANSFERS: accountPath("phone_transfers"),
    PHONE_TRANSFER_CANCEL: accountPath("phone_transfer_cancel"),
  },
  // The signed-in menu and the features this customer has.
  MENU: "/merchant/web/menu",
  // The inbox of everything the institution sent the customer.
  INBOX: { LIST: inboxPath("list"), READ: inboxPath("read"), UNREAD_COUNT: inboxPath("unread_count") },
  STATEMENT: { LIST: statementPath("list"), GET: statementPath("get"), DOWNLOAD: statementPath("download") },
  // The customer's own details (read-only) and their avatar.
  PROFILE: {
    GET: "/merchant/web/profile",
    FILE: profilePath("file"),
    AVATAR_IMAGE: profilePath("avatar_image"),
    AVATAR_PRESETS: profilePath("avatar_presets"),
    AVATAR_SET: profilePath("avatar_set"),
    AVATAR_UPLOAD: profilePath("avatar_upload"),
    AVATAR_REMOVE: profilePath("avatar_remove"),
  },
  // "Complete your verification": a customer approved at a lower KYC level
  // completes the next one, signed in.
  KYC: { STATUS: kycPath("status"), UPGRADE: kycPath("upgrade"), UPGRADE_BACK: kycPath("upgrade_back"), UPGRADE_UPLOAD: kycPath("upgrade_upload"), UPGRADE_FILE: kycPath("upgrade_file"), UPGRADE_SUBMIT: kycPath("upgrade_submit"), UPGRADE_CANCEL: kycPath("upgrade_cancel") },
  DASHBOARD: { LAYOUT_GET: dashboardPath("layout_get"), LAYOUT_SAVE: dashboardPath("layout_save") },
  // Cards (Customer portals: cards, 3 Oct 2026).
  CARD: Object.fromEntries(["list", "get", "offers", "issue", "request", "request_cancel", "activate", "pin_set", "pin_change", "pin_reset", "status", "details", "reissue"].map((call) => [call, cardPath(call)])),
  BRANDING: { GET: "/merchant/web/branding", FILE: "/merchant/web/branding/file" },
  CUSTOMER_ONBOARDING: onboardingEndpoints("individual"),
  CORPORATE_ONBOARDING: onboardingEndpoints("corporate"),
};
// Until the API says otherwise (the `session` block of sign-in and refresh): a
// web session unused for this long ends on the server, and the portal signs the
// customer out itself after the same time without any input.
export const IDLE_SIGN_OUT_SECONDS = 30 * 60;
// How long before a session's last moment the customer is told it is ending.
export const SESSION_END_WARN_SECONDS = 90;
// How long the sign-in button stays off after the server says there were too
// many failed attempts from this device or address (portal.too_many_attempts).
export const LOGIN_PAUSE_MS = 3 * 60 * 1000;
export const STORAGE_KEYS = {
  session: "innoverse-customer:session",
  branding: "innoverse-customer:branding",
  theme: "innoverse-customer:theme",
  // "1" while the customer has collapsed the sidebar; cleared at every sign-in
  // so it starts open and pinned.
  sidebarCollapsed: "innoverse-customer:sidebar-collapsed",
  onboardingTour: (kind) => `innoverse-customer:tour:${kind}`,
  onboardingReference: (kind) => `innoverse-customer:onboarding:${kind}`,
};

// One-time code settings for contact verification.
// Server-wide file limits for `file` fields. A document type can narrow
// both (`types[].file_formats` / `max_file_size_kb`).
export const FILE_UPLOAD = {
  formats: ["pdf", "jpeg", "png", "tiff", "webp"],
  maxBytes: 10 * 1024 * 1024,
};

// The code that starts an application (sent to the contact being used) or
// reopens one in progress (sent to its own email or phone).
export const ONBOARDING_CODE = { length: 6, resendSeconds: 45 };
