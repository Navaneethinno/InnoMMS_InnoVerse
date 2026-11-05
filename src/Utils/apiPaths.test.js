import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { API_ENDPOINTS } from "@/Utils/Constant";


// Every API path lives in Utils/Constant.jsx (API_ENDPOINTS), and screens reach
// them through Services/.
const ROOT = path.resolve("src");
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.jsx?$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
const relative = (file) => path.relative(ROOT, file).replaceAll("\\", "/");
const PATH = /["'`]\/?(config|customer|merchant|master|auth)\/[\w./${}-]*\w/;
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe("API paths", () => {
  it("are written only in Constant.jsx", () => {
    const found = files(ROOT)
      .filter((file) => relative(file) !== "Utils/Constant.jsx" && !relative(file).startsWith("Utils/I18n/"))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .filter((line) => !isComment(line) && PATH.test(line.split(" // ")[0]))
          .map((line) => `${relative(file)}: ${line.trim()}`),
      );
    expect(found).toEqual([]);
  }, 30000);

  it("each have one key", () => {
    const seen = new Map();
    const walk = (node, name) =>
      Object.entries(node).forEach(([key, value]) => {
        if (typeof value === "object") return walk(value, `${name}.${key}`);
        seen.set(value, [...(seen.get(value) ?? []), `${name}.${key}`]);
      });
    walk(API_ENDPOINTS, "API_ENDPOINTS");
    expect([...seen.values()].filter((keys) => keys.length > 1)).toEqual([]);
  });

  it("are used only through keys that exist", () => {
    const missing = files(ROOT).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const direct = [...source.matchAll(/API_ENDPOINTS((?:\.[A-Za-z_]\w*)+)/g)].map(([, keys]) => keys.slice(1).split("."));
      // const { CARD, AUTH: { LOGIN } } = API_ENDPOINTS, then CARD.LIST.
      const viaGroup = [...source.matchAll(/const \{([^}]*)\} = API_ENDPOINTS((?:\.\w+)*)/g)].flatMap(([, names, parent]) => {
        const base = parent.split(".").slice(1);
        return names
          .split(",")
          .map((name) => name.split(":")[0].trim())
          .filter(Boolean)
          .flatMap((group) => [[...base, group], ...[...source.matchAll(new RegExp(`(?<![A-Za-z0-9_])${group}((?:[.][A-Za-z_][A-Za-z0-9_]*)+)`, "g"))].map(([, keys]) => [...base, group, ...keys.slice(1).split(".")])]);
      });
      return [...direct, ...viaGroup]
        .filter((keys) => keys.reduce((node, key) => node?.[key], API_ENDPOINTS) === undefined)
        .map((keys) => `${relative(file)}: ${keys.join(".")}`);
    });
    expect(missing).toEqual([]);
  }, 30000);

  it("are reached from Services, not from screens", () => {
    const found = files(ROOT)
      .filter((file) => /^(Components|Hooks)\//.test(relative(file)))
      .filter((file) => /\bAPI_ENDPOINTS\b|\{[^}]*\bapi\b[^}]*\} from "@\/Services\/api\/client"/.test(readFileSync(file, "utf8")))
      .map(relative);
    expect(found).toEqual([]);
  }, 30000);
});
