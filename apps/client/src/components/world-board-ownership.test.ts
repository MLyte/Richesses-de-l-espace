import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const board = readFileSync(fileURLToPath(new URL("./WorldBoard.vue", import.meta.url)), "utf8");
const display = readFileSync(fileURLToPath(new URL("../views/DisplayView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("world board ownership markers", () => {
  it("passes live ownership to the shared TV board", () => {
    expect(display).toContain(':ownership="store.game.ownership"');
    expect(board).toContain("ownership: Record<string, string>;");
    expect(board).toContain("props.ownership[space.assetId]");
  });

  it("renders ownership entirely inside an owned concession", () => {
    expect(board).toContain('v-if="tile.owner" class="tile-owner-marker" x=".28" y=".28"');
    expect(board).toContain('v-if="tile.owner" class="tile-owner-glow" x=".65" y=".65"');
    expect(theme).toMatch(/\.tile-owner-marker\s*\{[^}]*stroke-width:\s*\.38/s);
    expect(theme).toMatch(/\.tile-owner-glow\s*\{[^}]*opacity:\s*\.18/s);
  });

  it("keeps unowned and special spaces free of ownership decoration", () => {
    expect(board).toContain("owner: null");
    expect(board).toContain('v-if="tile.owner" class="tile-owner-marker"');
  });
});
