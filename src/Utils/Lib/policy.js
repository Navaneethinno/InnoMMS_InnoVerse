import { DEFAULT_PIN_RULES, pinRulesFrom } from "./pinRules";

// The rules the API sends (`policy` in auth/me, and auth/policy before sign-in):
// the password, the transaction PIN and the one-time codes. The defaults are
// used until they arrive.
export const DEFAULT_POLICY = {
  known: false,
  // How this portal signs merchants in: "PIN", "PASSWORD" or both (`method` is the one to show first).
  // `separatePins`: the PIN that signs in is not the one that confirms payments (the merchant sets a transaction PIN after the first sign-in).
  login: { methods: ["PASSWORD"], method: "PASSWORD", separatePins: false },
  // The institution's countries for phone numbers (empty: any country), the
  // primary first: [{ name, alpha2, dial, min, max, primary }].
  phone: { countries: [] },
  // The institution's currencies, the primary first: [{ code, name, decimals, primary }].
  currencies: [],
  password: { min: 8, max: 64, requireLetter: true, requireDigit: true, requireSymbol: false },
  pinRules: DEFAULT_PIN_RULES,
  // The rules of the PIN that signs in (the transaction PIN's when the bank has one PIN).
  signinPinRules: DEFAULT_PIN_RULES,
  otp: { length: 6, expiresSeconds: 600, maxAttempts: 5, maxPerHour: 5 },
};

export function policyFrom(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_POLICY;
  const password = raw.password ?? {};
  const otp = raw.otp ?? {};
  const methods = (Array.isArray(raw.login?.methods) ? raw.login.methods : []).map((method) => String(method).toUpperCase());
  const usable = methods.length ? methods : DEFAULT_POLICY.login.methods;
  return {
    known: true,
    login: { methods: usable, method: usable.includes(String(raw.login?.method).toUpperCase()) ? String(raw.login.method).toUpperCase() : usable[0], separatePins: raw.login?.separate_pins === true },
    phone: {
      countries: (raw.phone?.countries ?? []).map((country) => ({
        name: country.name,
        alpha2: country.alpha2_code,
        dial: country.dial_code,
        min: Number(country.min_digits) || 1,
        max: Number(country.max_digits) || 15,
        primary: Boolean(country.primary),
      })),
    },
    currencies: (raw.currencies ?? []).map((currency) => ({ code: currency.currency_code, name: currency.currency_name, decimals: currency.currency_decimals, primary: Boolean(currency.primary) })),
    password: {
      min: Number(password.min) || DEFAULT_POLICY.password.min,
      max: Number(password.max) || DEFAULT_POLICY.password.max,
      requireLetter: password.require_letter ?? DEFAULT_POLICY.password.requireLetter,
      requireDigit: password.require_digit ?? DEFAULT_POLICY.password.requireDigit,
      requireSymbol: password.require_symbol ?? DEFAULT_POLICY.password.requireSymbol,
    },
    pinRules: pinRulesFrom(raw.txn_pin),
    signinPinRules: raw.login?.separate_pins === true && raw.login?.signin_pin ? pinRulesFrom(raw.login.signin_pin) : pinRulesFrom(raw.txn_pin),
    otp: {
      length: Number(otp.length) || DEFAULT_POLICY.otp.length,
      expiresSeconds: Number(otp.expires_seconds) || DEFAULT_POLICY.otp.expiresSeconds,
      maxAttempts: Number(otp.max_attempts) || DEFAULT_POLICY.otp.maxAttempts,
      maxPerHour: Number(otp.max_per_hour) || DEFAULT_POLICY.otp.maxPerHour,
    },
  };
}

// Whether a password meets the rules.
export const fitsPasswordRules = (rules, value) =>
  value.length >= rules.min &&
  value.length <= rules.max &&
  (!rules.requireLetter || /[A-Za-z]/.test(value)) &&
  (!rules.requireDigit || /\d/.test(value)) &&
  (!rules.requireSymbol || /[^A-Za-z0-9]/.test(value));

// "Use 8 to 64 characters. Include a letter and a number."
export function passwordRuleText(t, rules) {
  const needs = [rules.requireLetter && t("pw.letter"), rules.requireDigit && t("pw.digit"), rules.requireSymbol && t("pw.symbol")].filter(Boolean);
  const length = t("pw.length", { min: rules.min, max: rules.max });
  if (!needs.length) return length;
  const items = needs.length > 1 ? t("pw.and", { list: needs.slice(0, -1).join(", "), last: needs.at(-1) }) : needs[0];
  return `${length} ${t("pw.include", { items })}`;
}
