import { API_BASE_URL, API_ENDPOINTS } from "@/Utils/Constant";

// Passwords, PINs and one-time codes never travel as readable text: each is
// sealed with the platform's public key (RSA-OAEP, WebCrypto) and the API
// gateway opens it before the request reaches any service. An envelope works
// once, for five minutes, so every request seals afresh.
// Any password, PIN or code, at any depth of the body. The gateway opens an
// envelope under any field name, so sealing one more is harmless; the API's own
// list only decides what is refused in plain text once sealing is required.
const SEALED = new Set([
  "password", "old_password", "new_password", "confirm_password", "current_password",
  "current", "new", // auth/password_change, auth/pin_change and auth/signin_pin_change
  "signin_pin", // auth/pin_set: the sign-in PIN, to create the transaction PIN
  "pin", "current_pin", "new_pin", "confirm_pin", "txn_pin", "confirm", // transaction PIN, and the onboarding PIN pair
  "card_pin", "current_card_pin",
  "otp",
]);
const PREFIX = "enc:v1:";
// What the server shows for a PIN it holds: sending it back keeps the PIN.
const MASK = "********";

// The server's clock minus ours: an envelope is only valid for five minutes of
// the server's time, and a device clock can be wrong. Set from the key reply,
// from every reply's X-Server-Time, and from an "envelope expired" refusal.
let clockOffset = 0;
export function syncClock(serverTime) {
  const now = Number(serverTime);
  if (Number.isFinite(now) && now > 0) clockOffset = now - Date.now();
}

let keyPromise = null;
export const forgetCredentialKey = () => {
  keyPromise = null;
};

const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function importKey() {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CREDENTIAL_KEY}`);
  const payload = await response.json();
  const entry = payload?.data?.[0];
  if (!entry?.spki) throw new Error("No credential key");
  syncClock(entry.server_time);
  const key = await crypto.subtle.importKey("spki", fromBase64(entry.spki), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  return { id: entry.key_id, key };
}
const loadKey = () => (keyPromise ??= importKey().catch((error) => {
  keyPromise = null;
  throw error;
}));

async function seal(value) {
  const { id, key } = await loadKey();
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const plain = new TextEncoder().encode(JSON.stringify({ v: value, ts: Date.now() + clockOffset, n: nonce }));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, plain));
  return `${PREFIX}${id}:${toBase64Url(cipher)}`;
}

const isObject = (value) => value && typeof value === "object" && !(value instanceof FormData) && !(value instanceof Blob);

async function walk(value) {
  if (Array.isArray(value)) return Promise.all(value.map(walk));
  if (!isObject(value)) return value;
  const out = {};
  for (const [name, item] of Object.entries(value)) {
    if (SEALED.has(name) && typeof item === "string" && item !== "" && item !== MASK && !item.startsWith(PREFIX)) out[name] = await seal(item);
    else out[name] = await walk(item);
  }
  return out;
}

// The request body with every secret sealed. When the key cannot be had (the
// call failed, or the browser has no WebCrypto) the body goes as it is: the
// server still accepts plain values until it makes sealing mandatory.
export async function sealBody(body) {
  try {
    return await walk(body);
  } catch {
    return body;
  }
}
