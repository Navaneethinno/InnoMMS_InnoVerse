import i18n from "@/Utils/I18n/i18n";

// How many decimals each currency has (wallets and summaries say so), and the
// institution's time zone (auth/me): amounts and times are shown by them.
const decimalsOf = new Map();
// The merchant's own currency (their first wallet's): used when a reply gives
// an amount without one, rather than showing dollars.
let homeCurrency;
export function rememberCurrencies(list) {
  for (const item of list ?? []) {
    if (item?.currency_code && !homeCurrency) homeCurrency = item.currency_code;
    const places = Number(item?.currency_decimals);
    if (item?.currency_code && Number.isInteger(places) && places >= 0)
      decimalsOf.set(item.currency_code, places);
  }
}
let displayTimeZone;
export const setDisplayTimeZone = (zone) => {
  displayTimeZone = zone || undefined;
};

// A date as YYYY-MM-DD on the user's own calendar. (toISOString gives the UTC
// day, which is yesterday or tomorrow for part of the day in most time zones.)
export const localIsoDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
// A whole phone number's digits without its country code. `countries` is the
// policy's list, [{ dial: "+258" }, ...].
export function nationalDigits(phone, countries = []) {
  const digits = digitsOnly(phone);
  const dial = countries
    .map((country) => digitsOnly(country.dial))
    .sort((a, b) => b.length - a.length)
    .find((code) => code && digits.startsWith(code));
  return dial ? digits.slice(dial.length) : digits;
}

// Amounts arrive as decimal strings ("100.50") with a currency code.
export function formatMoney(amount, currency, { signed = false } = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  let text;
  try {
    // The decimal string goes in as it is, so a very large amount keeps every digit.
    const digits = String(amount).trim().replace(/^[-+]/, "");
    const code = currency || homeCurrency || "USD";
    const places = decimalsOf.get(code);
    const formatter = new Intl.NumberFormat(i18n.resolvedLanguage, {
      style: "currency",
      currency: code,
      ...(places != null
        ? { minimumFractionDigits: places, maximumFractionDigits: places }
        : {}),
    });
    text = /^\d+(\.\d+)?$/.test(digits)
      ? formatter.format(digits)
      : formatter.format(Math.abs(value));
  } catch {
    // Not an ISO currency code: show the number and the code as sent.
    text =
      `${Math.abs(value).toLocaleString(i18n.resolvedLanguage, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ""}`.trim();
  }
  if (!signed) return value < 0 ? `-${text}` : text;
  return `${value < 0 ? "-" : "+"}${text}`;
}

// 2,580,000,000,041 -> 2.6T: for chart axes, where there is no room for the digits.
// For lines that may be absent: null when there is no amount, so the line hides.
export const moneyOrNull = (value, currency) =>
  value != null && value !== "" ? formatMoney(value, currency) : null;

export const formatCompact = (value) =>
  new Intl.NumberFormat(i18n.resolvedLanguage, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

// A big figure shrinks to fit its card as the text gets longer (a balance in
// the trillions must not run out of the card).
// Times arrive in UTC; they are shown in the institution's time zone when the
// API has said which (`timezone` in auth/me), else the browser's.
export const toDate = (value) => {
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
export const formatDateTime = (value) =>
  shown(value, (date, options) =>
    date.toLocaleString(i18n.resolvedLanguage, options),
  );
export const formatDate = (value) =>
  shown(value, (date, options) =>
    date.toLocaleDateString(i18n.resolvedLanguage, options),
  );
// "9:06 AM" and "28 Sep": for lists that group by day.
export const formatClock = (value) =>
  shown(value, (date, options) =>
    date.toLocaleTimeString(i18n.resolvedLanguage, {
      hour: "numeric",
      minute: "2-digit",
      ...options,
    }),
  );
// Day first ("28 Sep", with "Sep" for September): English is put together from
// its parts, other languages already write the day first.
export const formatShortDate = (value) =>
  shown(value, (date, options) => {
    if (i18n.resolvedLanguage !== "en")
      return date.toLocaleDateString(i18n.resolvedLanguage, {
        day: "numeric",
        month: "short",
        ...options,
      });
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      ...options,
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type)?.value;
    return `${pick("day")} ${pick("month")}`;
  });
export const formatTime = (value) =>
  shown(value, (date, options) =>
    date.toLocaleTimeString(i18n.resolvedLanguage, options),
  );

// A client-side reference for one payment attempt.
export const newReference = () =>
  window.crypto?.randomUUID?.() ??
  `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// What the API will check again: a quick look before sending.

// A history line's amount: the total the party paid or got (amount + fee),
// signed by its direction. Older lines without a total use the net amount.
export const lineAmount = (item) =>
  item?.total_amount != null ? `${item.direction === "DR" ? "-" : ""}${String(item.total_amount).replace(/^[-+]/, "")}` : (item?.net_amount ?? item?.amount);
