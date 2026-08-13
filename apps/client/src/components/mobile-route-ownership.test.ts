import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const route = readFileSync(fileURLToPath(new URL("./MobileRouteMap.vue", import.meta.url)), "utf8");

describe("mobile route ownership markers", () => {
  it("carries the owner and their color onto every owned concession", () => {
    expect(route).toContain("owner,");
    expect(route).toContain("owner: null");
    expect(route).toContain("owned: entry.owner");
    expect(route).toContain("'--owner-color': entry.owner?.color");
  });

  it("keeps the ownership ring visible when the case is focused", () => {
    expect(route).toMatch(/\.route-stop\.owned\s*\{[^}]*inset 0 0 0 2px var\(--owner-color\)/s);
    expect(route).toMatch(/\.route-stop\.owned\.focused\s*\{[^}]*inset 0 0 0 2px var\(--owner-color\)/s);
  });
});
