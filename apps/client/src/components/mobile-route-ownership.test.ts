import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const route = readFileSync(fileURLToPath(new URL("./MobileRouteMap.vue", import.meta.url)), "utf8");

describe("mobile route resource rights markers", () => {
  it("marks every resource case carrying payable rights", () => {
    expect(route).toContain("getResourceRightsHolders(props.players, space.resourceId)");
    expect(route).toContain("'has-rights': entry.rightsHolders.length");
    expect(route).toContain(":data-rights-holder-ids");
    expect(route).toContain('class="route-stop__rights"');
  });

  it("renders one permanent inner ring per eligible rights holder", () => {
    expect(route).toContain('v-for="(holder, rightsIndex) in entry.rightsHolders"');
    expect(route).toContain("'--rights-inset': `${2 + rightsIndex * 4}px`");
    expect(route).toMatch(/\.route-stop__rights i\s*\{[^}]*inset:\s*var\(--rights-inset\)[^}]*border:\s*2px solid var\(--rights-color\)/s);
    expect(route).not.toContain(".route-stop.owned.focused");
  });

  it("also marks resource dividend spaces because they trigger royalties", () => {
    expect(route).toContain("getResourceRightsHolders(props.players, resource?.id ?? null)");
    expect(route).toContain("Ressource concernée");
  });
});
