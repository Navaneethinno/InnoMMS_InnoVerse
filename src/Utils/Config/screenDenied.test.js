import { describe, expect, it } from "vitest";
import { screenDenied } from "./screenDenied";

const screens = { send: { to: "/send" }, cards: { to: "/cards" }, profile: { to: "/profile" }, security: { to: "/security" }, dashboard: { to: "/dashboard" }, notifications: { to: "/notifications" } };
const menu = [{ key: "send" }];

describe("screenDenied", () => {
  it("allows a screen in the menu, and its inner pages", () => {
    expect(screenDenied(screens, menu, "/send")).toBe(false);
    expect(screenDenied(screens, menu, "/send/review")).toBe(false);
  });

  it("denies a menu screen the user was not given", () => {
    expect(screenDenied(screens, menu, "/cards")).toBe(true);
    expect(screenDenied(screens, menu, "/cards/21")).toBe(true);
  });

  it("always allows the user's own pages", () => {
    for (const path of ["/dashboard", "/profile", "/security", "/notifications"]) expect(screenDenied(screens, menu, path)).toBe(false);
  });

  it("leaves pages that are not menu screens alone", () => {
    expect(screenDenied(screens, menu, "/somewhere-else")).toBe(false);
  });

  it("blocks nothing before the menu has loaded", () => {
    expect(screenDenied(screens, undefined, "/cards")).toBe(false);
    expect(screenDenied(screens, [], "/cards")).toBe(false);
  });
});
