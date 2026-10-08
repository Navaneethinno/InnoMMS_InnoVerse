// The transaction PIN's rules come from the merchant's product (an exact
// length, or a range; digits only or letters too; whether it may equal the
// password). The API sends them as `pin_rules` (auth/me, and auth/pin_rules
// before sign-in); until they are known the box is the loosest sensible one and
// the API's message says what is wrong.
export const DEFAULT_PIN_RULES = { length: 0, minLength: 4, maxLength: 12, letters: true, mayEqualPassword: true };

// `pin_rules` from the API -> the shape the screens use.
export function pinRulesFrom(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_PIN_RULES;
  const length = Number(raw.length) || 0;
  const minLength = length || Number(raw.min_length) || DEFAULT_PIN_RULES.minLength;
  const maxLength = length || Number(raw.max_length) || Math.max(minLength, DEFAULT_PIN_RULES.maxLength);
  return { length, minLength, maxLength, letters: raw.letters === true, mayEqualPassword: raw.may_equal_password !== false };
}

// What the box keeps while typing.
export const sanitizePin = (rules, value) => String(value ?? "").replace(rules.letters ? /[^A-Za-z0-9]/g : /\D/g, "").slice(0, rules.maxLength);

// Whether a finished PIN fits the rules.
export const fitsPinRules = (rules, value) =>
  value.length >= rules.minLength && value.length <= rules.maxLength && (rules.letters ? /^[A-Za-z0-9]+$/ : /^\d+$/).test(value);

// "Use 4 digits.", "Use 4 to 6 digits.", "Use 6 letters or digits."...
export function pinRuleText(t, rules) {
  const kind = rules.letters ? "Alnum" : "Digits";
  return rules.minLength === rules.maxLength
    ? t(`pin.exact${kind}`, { length: rules.minLength })
    : t(`pin.range${kind}`, { min: rules.minLength, max: rules.maxLength });
}
