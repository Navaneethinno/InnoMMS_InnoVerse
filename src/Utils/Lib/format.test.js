import { describe, expect, it, vi } from "vitest";

vi.mock("@/Utils/I18n/i18n", () => ({ default: { resolvedLanguage: "en-US" } }));

const { formatMoney, localIsoDay, moneyOrNull, nationalDigits, rememberCurrencies } = await import("./format");

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

describe("localIsoDay", () => {
  it("gives the calendar day of the user's own clock", () => {
    expect(localIsoDay(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(localIsoDay(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("nationalDigits", () => {
  const countries = [{ dial: "+258" }, { dial: "+234" }];
  it("drops the country code the number starts with", () => {
    expect(nationalDigits("+258841234567", countries)).toBe("841234567");
    expect(nationalDigits("+2348012345678", countries)).toBe("8012345678");
  });
  it("keeps a number with no known code", () => {
    expect(nationalDigits("841234567", countries)).toBe("841234567");
    expect(nationalDigits("+258841234567", [])).toBe("258841234567");
  });
});

describe("moneyOrNull", () => {
  it("hides an absent amount but not a zero", () => {
    expect(moneyOrNull(null, "USD")).toBeNull();
    expect(moneyOrNull("", "USD")).toBeNull();
    expect(moneyOrNull("0", "USD")).toBe("$0.00");
  });
});
