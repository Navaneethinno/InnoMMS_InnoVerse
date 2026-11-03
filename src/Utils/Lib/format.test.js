import { describe, expect, it, vi } from "vitest";

vi.mock("@/Utils/I18n/i18n", () => ({ default: { resolvedLanguage: "en-US" } }));

const { formatMoney, rememberCurrencies } = await import("./format");

const spaces = (text) => text.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("shows a decimal string with its currency", () => {
    expect(formatMoney("100.50", "USD")).toBe("$100.50");
  });

  it("keeps every digit of a very large amount", () => {
    expect(formatMoney("12345678901234567.89", "USD")).toBe("$12,345,678,901,234,567.89");
  });

  it("marks a negative, and signs when asked", () => {
    expect(formatMoney("-5", "USD")).toBe("-$5.00");
    expect(formatMoney("5", "USD", { signed: true })).toBe("+$5.00");
    expect(formatMoney("-5", "USD", { signed: true })).toBe("-$5.00");
  });

  it("shows a dash for what is not an amount", () => {
    expect(formatMoney("abc", "USD")).toBe("—");
  });

  it("uses the decimals the wallet gave for its currency", () => {
    rememberCurrencies([{ currency_code: "MZN", currency_decimals: 0 }]);
    expect(spaces(formatMoney("1000", "MZN"))).toBe("MZN 1,000");
  });

  it("uses the merchant's own currency when a reply has none", () => {
    expect(spaces(formatMoney("10", undefined))).toBe("MZN 10");
  });

  it("shows the number and the code for a code that is not ISO", () => {
    expect(formatMoney("10", "NOT-A-CODE")).toContain("10.00");
  });
});
