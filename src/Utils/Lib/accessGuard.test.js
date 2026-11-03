import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The sidebar comes from the backend's menu and the features flags: no screen
// may decide access from a hardcoded user, institution or plan of its own.
const ROOT = path.resolve("src/Components");
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.jsx$/.test(name) ? [full] : [];
  });

describe("access", () => {
  it("no screen compares the user to a fixed id, name or plan", () => {
    const fixed = /\buser\??\.(id|name|username|phone|inst_profile_id|institution_id|plan)\b\s*(===|!==)\s*["'\d]/;
    const found = files(ROOT).filter((file) => fixed.test(readFileSync(file, "utf8")));
    expect(found.map((file) => path.relative(ROOT, file))).toEqual([]);
  });
});
