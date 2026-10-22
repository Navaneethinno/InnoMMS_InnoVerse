import { apiLanguageHeader } from "@/Utils/Lib/apiLanguage";

// Read de-duplication and a short cache, under portalPost.
//
// - Reads: identical calls started within JOIN_MS share one request (the same
//   wallets or menu asked for by several widgets at once).
// - Settings that rarely change (menu, branding, filters, transaction types,
//   providers, PIN rules, ...): a successful reply is reused for CACHE_MS.
// - Any other call (send, add, rename, upload, ...) empties the cache, so the
//   portal never shows the merchant's own change stale. Sign-out empties it too.

const JOIN_MS = 300;
const CACHE_MS = 60000;
const READ = /\/(list|get|options|wallets|history|history_filters|transaction|receipt|limits|summary|txn_types|ext_providers|ext_last|saved_accounts|my_code|phone_transfers|menu|unread_count|profile|avatar_presets|status|layout_get|branding|language|pin_rules|policy|sessions|me|float|signups|agents|offers|quote|applications|application_get|preclose_quote|settlement_quote)$/;
const CACHED = /\/(options|history_filters|txn_types|ext_providers|menu|avatar_presets|branding|language|pin_rules|policy)$/;

const inflight = new Map();
const cache = new Map();

export async function cachedPost(endpoint, body, send) {
  const path = String(endpoint).replace(/\/+$/, "");
  if (!READ.test(path) || body instanceof FormData) {
    const result = await send();
    cache.clear();
    return result;
  }
  const key = [path, JSON.stringify(body ?? {}), apiLanguageHeader()["x-api-lang"] ?? ""].join("\u0000");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.result;
  const joined = inflight.get(key);
  if (joined && now - joined.at < JOIN_MS) return joined.promise;

  const entry = { at: now, promise: send() };
  inflight.set(key, entry);
  try {
    const result = await entry.promise;
    if (CACHED.test(path)) cache.set(key, { at: Date.now(), result });
    return result;
  } finally {
    if (inflight.get(key) === entry) inflight.delete(key);
  }
}

export function clearReadCache() {
  cache.clear();
  inflight.clear();
}
