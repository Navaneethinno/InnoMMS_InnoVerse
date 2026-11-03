import { describe, expect, it } from "vitest";
import { DEFAULT_PIN_RULES, fitsPinRules, pinRulesFrom, sanitizePin } from "./pinRules";

describe("pinRulesFrom", () => {
  it("uses the loose defaults until the API has said", () => {
    expect(pinRulesFrom(null)).toBe(DEFAULT_PIN_RULES);
  });

  it("treats an exact length as both limits", () => {
    const rules = pinRulesFrom({ length: 4 });
    expect([rules.minLength, rules.maxLength]).toEqual([4, 4]);
  });

  it("is digits only unless letters are allowed", () => {
    expect(pinRulesFrom({ length: 4 }).letters).toBe(false);
    expect(pinRulesFrom({ length: 4, letters: true }).letters).toBe(true);
  });
});

describe("a PIN", () => {
  const digits = pinRulesFrom({ length: 4 });
  const letters = pinRulesFrom({ min_length: 4, max_length: 6, letters: true });

  it("keeps only allowed characters while typing", () => {
    expect(sanitizePin(digits, "1a2b3c4d")).toBe("1234");
    expect(sanitizePin(letters, "a1-b2")).toBe("a1b2");
  });

  it("must fit the length", () => {
    expect(fitsPinRules(digits, "123")).toBe(false);
    expect(fitsPinRules(digits, "1234")).toBe(true);
    expect(fitsPinRules(digits, "12345")).toBe(false);
  });

  it("must fit the characters", () => {
    expect(fitsPinRules(digits, "12a4")).toBe(false);
    expect(fitsPinRules(letters, "ab12")).toBe(true);
  });
});
