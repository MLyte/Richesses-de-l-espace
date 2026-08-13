import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const board = readFileSync(fileURLToPath(new URL("./WorldBoard.vue", import.meta.url)), "utf8");
const display = readFileSync(fileURLToPath(new URL("../views/DisplayView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("world board resource rights markers", () => {
  it("passes live holdings and ownership to the shared TV board", () => {
    expect(display).toContain(':ownership="store.game.ownership"');
    expect(board).toContain("ownership: Record<string, string>;");
    expect(board).toContain("props.ownership[space.assetId]");
  });

  it("renders one nested inner marker per eligible rights holder", () => {
    expect(board).toContain("rightsHolders: getResourceRightsHolders(props.players, space.resourceId)");
    expect(board).toContain('v-for="(holder, rightsIndex) in tile.rightsHolders"');
    expect(board).toContain(':x=".2 + rightsIndex * .28"');
    expect(theme).toMatch(/\.tile-rights-marker\s*\{[^}]*stroke-width:\s*\.28/s);
  });

  it("marks dividend spaces but leaves unrelated special spaces unmarked", () => {
    expect(board).toContain('space.type === "special" && space.kind === "dividend" ? space.resourceId : null');
    expect(board).toContain("getResourceRightsHolders(props.players, resourceId)");
  });
});
