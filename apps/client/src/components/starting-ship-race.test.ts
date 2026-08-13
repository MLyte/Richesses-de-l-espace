import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPACE_REGIONS, STARTING_RACE_SHIPS } from "@richesses-espace/game";

const race = readFileSync(fileURLToPath(new URL("./StartingShipRace.vue", import.meta.url)), "utf8");
const playerView = readFileSync(fileURLToPath(new URL("../views/PlayerView.vue", import.meta.url)), "utf8");
const displayView = readFileSync(fileURLToPath(new URL("../views/DisplayView.vue", import.meta.url)), "utf8");

describe("starting ship race UI", () => {
  it("offers all seven named regions, then races only the selected ships", () => {
    expect(STARTING_RACE_SHIPS).toHaveLength(7);
    expect(STARTING_RACE_SHIPS.every((id) => SPACE_REGIONS.some((region) => region.id === id))).toBe(true);
    expect(race).toContain("STARTING_RACE_SHIPS.map");
    expect(race).toContain("game.startingRace.finishOrder.map");
    expect(race).toContain("Seuls les vaisseaux choisis prendront le départ");
  });

  it("locks occupied choices and renders the authoritative finish order", () => {
    expect(race).toContain("Boolean(selectedBy(region.id))");
    expect(race).toContain("game.startingRace.finishOrder.indexOf");
    expect(race).toContain("left: var(--finish-position)");
    expect(race).toContain("prefers-reduced-motion: reduce");
  });

  it("explains the choice before robots play and keeps the human ship identifiable", () => {
    expect(race).toContain("Avant que les robots choisissent");
    expect(race).toContain("Les robots choisissent après vous");
    expect(race).toContain("Votre vaisseau dans la course");
    expect(race).toContain("race-lane--mine");
    expect(race).toContain("ship-choice__badge--taken");
    expect(race).toContain("Choisi par {{ selectedBy(region.id)?.name }}");
  });

  it("is present on both the shared display and the phone controller", () => {
    for (const source of [playerView, displayView]) {
      expect(source).toContain("StartingShipRace");
      expect(source).toContain("SHIP_SELECTION");
      expect(source).toContain("SHIP_RACE");
    }
    expect(playerView).toContain("SELECT_STARTING_SHIP");
  });
});
