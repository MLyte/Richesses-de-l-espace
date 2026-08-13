import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const gameIcon = readFileSync(fileURLToPath(new URL("./GameIcon.vue", import.meta.url)), "utf8");
const playerToken = readFileSync(fileURLToPath(new URL("./PlayerTokenIcon.vue", import.meta.url)), "utf8");
const assetCard = readFileSync(fileURLToPath(new URL("./AssetCard.vue", import.meta.url)), "utf8");
const soundToggle = readFileSync(fileURLToPath(new URL("./SoundToggle.vue", import.meta.url)), "utf8");
const board = readFileSync(fileURLToPath(new URL("./WorldBoard.vue", import.meta.url)), "utf8");

describe("icon source policy", () => {
  it("uses Lucide for every game and player pictogram", () => {
    for (const source of [gameIcon, playerToken, assetCard, soundToggle]) {
      expect(source).toContain('from "@lucide/vue"');
      expect(source).not.toMatch(/<(?:svg|path|polygon|polyline|line)\b/);
    }
  });

  it("renders board pictograms through the Lucide-backed components", () => {
    expect(board).toContain('<GameIcon class="tile-special__icon" :name="tile.special.icon"');
    expect(board).not.toContain("tile-special__icon-host");
    expect(board).toContain('<PlayerTokenIcon class="pawn-symbol" :symbol="player.symbol"');
  });

  it("colors concessions from their producing stellar region", () => {
    expect(assetCard).toContain("SPACE_REGIONS.find");
    expect(assetCard).toContain("'--sector': region.color");
    expect(board).toContain("title.stellarSectorId");
    expect(board).not.toContain("SECTORS");
  });
});
