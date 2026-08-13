import { describe, expect, it } from "vitest";
import { REFERENCE_CONCESSION_PROFILES, SPACE_CONCESSIONS } from "./assets";
import { BOARD, BOARD_COUNTS } from "./board";
import { PLANETARY_SYSTEMS, PRODUCING_WORLDS, SPACE_REGIONS } from "./countries";
import { TECHNOLOGIES } from "./levers";
import { COSMIC_RESOURCES } from "./resources";
import { COSMIC_EVENTS } from "./trends";

describe("référentiel Richesses de l’espace", () => {
  it("respecte toutes les cardinalités obligatoires", () => {
    expect(SPACE_REGIONS).toHaveLength(7);
    expect(PRODUCING_WORLDS).toHaveLength(28);
    expect(COSMIC_RESOURCES).toHaveLength(24);
    expect(SPACE_CONCESSIONS).toHaveLength(144);
    expect(COSMIC_EVENTS).toHaveLength(14);
    expect(TECHNOLOGIES).toHaveLength(13);
    expect(BOARD_COUNTS).toEqual({ total: 78, classic: 48, special: 29, countries: 28 });
  });

  it("transpose exactement les 24 richesses de référence sans famille ajoutée", () => {
    expect(COSMIC_RESOURCES.map(({ referenceName }) => referenceName)).toEqual([
      "Aluminium", "Blé", "Bois", "Cacao", "Café", "Charbon", "Cobalt", "Coton", "Cuivre", "Éolien", "Fer", "Gaz",
      "Hydraulique", "Laine", "Maïs", "Or", "Pétrole", "Plomb", "Riz", "Solaire", "Sucre", "Thé", "Tourisme", "Uranium"
    ]);
    for (const resource of COSMIC_RESOURCES) {
      expect(resource).not.toHaveProperty("familyId");
      expect(resource).not.toHaveProperty("sectorId");
    }
    for (const concession of SPACE_CONCESSIONS) {
      expect(concession).not.toHaveProperty("familyId");
      expect(concession).not.toHaveProperty("sectorId");
    }
  });

  it("relie chaque système, monde et concession à des références valides", () => {
    const regionIds = new Set(SPACE_REGIONS.map(({ id }) => id));
    const systemIds = new Set(PLANETARY_SYSTEMS.map(({ id }) => id));
    const worldIds = new Set(PRODUCING_WORLDS.map(({ id }) => id));
    const resourceIds = new Set(COSMIC_RESOURCES.map(({ id }) => id));
    for (const system of PLANETARY_SYSTEMS) expect(regionIds.has(system.regionId), system.name).toBe(true);
    for (const world of PRODUCING_WORLDS) {
      expect(systemIds.has(world.systemId), world.name).toBe(true);
      expect(regionIds.has(world.sectorId), world.name).toBe(true);
    }
    for (const concession of SPACE_CONCESSIONS) {
      expect(worldIds.has(concession.worldId), concession.name).toBe(true);
      expect(systemIds.has(concession.systemId), concession.name).toBe(true);
      expect(regionIds.has(concession.stellarSectorId), concession.name).toBe(true);
      expect(resourceIds.has(concession.resourceId), concession.name).toBe(true);
    }
  });

  it("conserve les six pourcentages et prix imprimés pour chaque ressource", () => {
    expect(Object.keys(REFERENCE_CONCESSION_PROFILES)).toEqual(COSMIC_RESOURCES.map(({ referenceName }) => referenceName));
    for (const resource of COSMIC_RESOURCES) {
      const concessions = SPACE_CONCESSIONS.filter((item) => item.resourceId === resource.id);
      const profile = REFERENCE_CONCESSION_PROFILES[resource.referenceName]!;
      expect(concessions, resource.name).toHaveLength(6);
      expect(concessions.map(({ sharePercent }) => sharePercent), resource.referenceName).toEqual(profile.shares);
      expect(concessions.map(({ purchasePrice }) => purchasePrice), resource.referenceName).toEqual(profile.prices);
      expect(new Set(concessions.map(({ worldId }) => worldId)).size, resource.name).toBe(6);
      expect(Object.keys(resource.royalties).map(Number)).toEqual([30, 50, 70, 90]);
      expect(resource.royalties[30]).toBeLessThan(resource.royalties[50]);
      expect(resource.royalties[50]).toBeLessThan(resource.royalties[70]);
      expect(resource.royalties[70]).toBeLessThan(resource.royalties[90]);
    }
    expect(COSMIC_RESOURCES.map((resource) => SPACE_CONCESSIONS
      .filter((item) => item.resourceId === resource.id)
      .reduce((total, item) => total + item.sharePercent, 0)))
      .toEqual([90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 95, 100, 95, 100, 95, 95, 100, 100, 100]);
  });

  it("rend chaque catalogue de monde accessible depuis une case classique", () => {
    const classic = BOARD.filter((space) => space.type === "asset");
    expect(classic).toHaveLength(48);
    expect(new Set(classic.map(({ worldId }) => worldId))).toEqual(new Set(PRODUCING_WORLDS.map(({ id }) => id)));
    expect(new Set(classic.map(({ resourceId }) => resourceId))).toEqual(new Set(COSMIC_RESOURCES.map(({ id }) => id)));
    for (const resource of COSMIC_RESOURCES) expect(classic.filter(({ resourceId }) => resourceId === resource.id), resource.name).toHaveLength(2);
    for (const world of PRODUCING_WORLDS) expect(SPACE_CONCESSIONS.some(({ worldId }) => worldId === world.id), world.name).toBe(true);
  });

  it("respecte la composition exacte des cases spéciales", () => {
    const count = (kind: string) => BOARD.filter((space) => space.type === "special" && space.kind === kind).length;
    expect(count("regional_choice")).toBe(4);
    expect(count("global_choice")).toBe(2);
    expect(count("auction")).toBe(4);
    expect(count("trend")).toBe(6);
    expect(count("dividend")).toBe(8);
    expect(count("customs")).toBe(2);
    expect(count("joker")).toBe(3);
    expect(BOARD.filter(({ type }) => type === "hub")).toHaveLength(1);
  });

  it("répartit chaque famille spéciale sur l’ensemble du circuit", () => {
    const maximumCircularGap = (kind: string) => {
      const positions = BOARD.flatMap((space, index) => space.type === "special" && space.kind === kind ? [index] : []);
      return Math.max(...positions.map((position, index) => (positions[(index + 1) % positions.length]! - position + BOARD.length) % BOARD.length));
    };

    expect(maximumCircularGap("auction")).toBeLessThanOrEqual(21);
    expect(maximumCircularGap("regional_choice")).toBeLessThanOrEqual(22);
    expect(maximumCircularGap("customs")).toBeLessThanOrEqual(41);
    expect(maximumCircularGap("global_choice")).toBeLessThanOrEqual(40);
  });
  it("donne aux événements une direction bancaire impossible à inverser", () => {
    for (const card of COSMIC_EVENTS) {
      expect(card.amount, card.title).toBeGreaterThan(0);
      expect(card.description.startsWith(card.bankDirection === "bank_to_player" ? "Recevez" : "Versez"), card.title).toBe(true);
    }
  });
});
