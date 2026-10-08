import i18n from "@/Utils/I18n/i18n";

// How many decimals each currency has (wallets and summaries say so), and the
// institution's time zone (auth/me): amounts and times are shown by them.
const decimalsOf = new Map();
export function rememberCurrencies(list) {
  for (const item of list ?? []) {
    const places = Number(item?.currency_decimals);
    if (item?.currency_code && Number.isInteger(places) && places >= 0) decimalsOf.set(item.currency_code, places);
  }
}
let displayTimeZone;
export const setDisplayTimeZone = (zone) => {
  displayTimeZone = zone || undefined;
};

// Amounts arrive as decimal strings ("100.50") with a currency code.
export function formatMoney(amount, currency, { signed = false } = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  let text;
  try {
    // The decimal string goes in as it is, so a very large amount keeps every digit.
    const digits = String(amount).trim().replace(/^[-+]/, "");
    const places = decimalsOf.get(currency);
    const formatter = new Intl.NumberFormat(i18n.resolvedLanguage, { style: "currency", currency: currency || "USD", ...(places != null ? { minimumFractionDigits: places, maximumFractionDigits: places } : {}) });
    text = /^\d+(\.\d+)?$/.test(digits) ? formatter.format(digits) : formatter.format(Math.abs(value));
  } catch {
    // Not an ISO currency code: show the number and the code as sent.
    text = `${Math.abs(value).toLocaleString(i18n.resolvedLanguage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ""}`.trim();
  }
  if (!signed) return value < 0 ? `-${text}` : text;
  return `${value < 0 ? "-" : "+"}${text}`;
}

// 2,580,000,000,041 -> 2.6T: for chart axes, where there is no room for the digits.
export const formatCompact = (value) => new Intl.NumberFormat(i18n.resolvedLanguage, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);

// A big figure shrinks to fit its card as the text gets longer (a balance in
// the trillions must not run out of the card).
export const amountSize = (text, sizes = ["text-3xl", "text-2xl", "text-xl", "text-lg"]) => {
  const length = String(text).length;
  return length > 20 ? sizes[3] : length > 16 ? sizes[2] : length > 12 ? sizes[1] : sizes[0];
};

// Times arrive in UTC; they are shown in the institution's time zone when the
// API has said which (`timezone` in auth/me), else the browser's.
const toDate = (value) => {
  if (value instanceof Date) return value;
  if (!value) return null;
  const text = String(value);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
};
const shown = (value, format) => {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return value ? String(value) : "";
  return format(date, { timeZone: displayTimeZone });
};
export const getDisplayTimeZone = () => displayTimeZone;
export const formatDateTime = (value) => shown(value, (date, options) => date.toLocaleString(i18n.resolvedLanguage, options));
export const formatDate = (value) => shown(value, (date, options) => date.toLocaleDateString(i18n.resolvedLanguage, options));
// "9:06 AM" and "28 Sep": for lists that group by day.
export const formatClock = (value) => shown(value, (date, options) => date.toLocaleTimeString(i18n.resolvedLanguage, { hour: "numeric", minute: "2-digit", ...options }));
// Day first ("28 Sep", with "Sep" for September): English is put together from
// its parts, other languages already write the day first.
export const formatShortDate = (value) =>
  shown(value, (date, options) => {
    if (i18n.resolvedLanguage !== "en") return date.toLocaleDateString(i18n.resolvedLanguage, { day: "numeric", month: "short", ...options });
    const parts = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", ...options }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value;
    return `${pick("day")} ${pick("month")}`;
  });
export const formatTime = (value) => shown(value, (date, options) => date.toLocaleTimeString(i18n.resolvedLanguage, options));

// A client-side reference for one payment attempt.
export const newReference = () => window.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// What the API will check again: a quick look before sending.
