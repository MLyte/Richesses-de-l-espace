import { describe, expect, it } from "vitest";
import { ASSETS } from "./assets";
import { BOARD, BOARD_COUNTS } from "./board";
import { CONTINENT_NAMES, COUNTRIES } from "./countries";
import { RESOURCES } from "./resources";
import { TREND_CARDS } from "./trends";

describe("extended world dataset", () => {
  it("contains a world-scale original catalogue", () => {
    expect(CONTINENT_NAMES).toHaveLength(7);
    expect(COUNTRIES).toHaveLength(28);
    expect(RESOURCES).toHaveLength(24);
    expect(ASSETS).toHaveLength(144);
    for (const continent of CONTINENT_NAMES) expect(COUNTRIES.filter((country) => country.continent === continent), continent).toHaveLength(4);
    for (const sectorId of ["energy", "metals", "agriculture", "biomaterials"]) expect(RESOURCES.filter((resource) => resource.sectorId === sectorId), sectorId).toHaveLength(6);
  });

  it("gives every resource six titles totalling 100 percent across six countries and continents", () => {
    for (const resource of RESOURCES) {
      const titles = ASSETS.filter((asset) => asset.resourceId === resource.id);
      expect(titles, resource.name).toHaveLength(6);
      expect(titles.reduce((total, title) => total + title.share, 0), resource.name).toBe(100);
      expect(new Set(titles.map((title) => title.countryId)).size, resource.name).toBe(6);
      expect(new Set(titles.map((title) => COUNTRIES.find((country) => country.id === title.countryId)!.continent)).size, resource.name).toBe(6);
      expect(resource.royalties[30]).toBeLessThan(resource.royalties[50]);
      expect(resource.royalties[50]).toBeLessThan(resource.royalties[70]);
      expect(resource.royalties[70]).toBeLessThan(resource.royalties[90]);
    }
  });

  it("places all countries and every resource on the shared route", () => {
    const classicSpaces = BOARD.filter((space) => space.type === "asset");
    expect(BOARD_COUNTS).toEqual({ total: 78, classic: 48, special: 29, countries: 28 });
    expect(classicSpaces).toHaveLength(48);
    expect(new Set(classicSpaces.map((space) => ASSETS.find((asset) => asset.id === space.assetId)!.countryId)).size).toBe(COUNTRIES.length);
    expect(new Set(classicSpaces.map((space) => ASSETS.find((asset) => asset.id === space.assetId)!.resourceId)).size).toBe(RESOURCES.length);
    for (const resource of RESOURCES) expect(classicSpaces.filter((space) => ASSETS.find((asset) => asset.id === space.assetId)!.resourceId === resource.id)).toHaveLength(2);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "auction")).toHaveLength(4);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "trend")).toHaveLength(6);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "dividend")).toHaveLength(8);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "regional_choice")).toHaveLength(4);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "global_choice")).toHaveLength(2);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "customs")).toHaveLength(2);
    expect(BOARD.filter((space) => space.type === "special" && space.kind === "joker")).toHaveLength(3);
  });

  it("gives every special space the data required by its rule", () => {
    const dividends = BOARD.filter((space) => space.type === "special" && space.kind === "dividend");
    expect(new Set(dividends.map((space) => space.resourceId)).size).toBe(8);
    for (const sectorId of ["energy", "metals", "agriculture", "biomaterials"]) {
      expect(dividends.filter((space) => RESOURCES.find((resource) => resource.id === space.resourceId)?.sectorId === sectorId)).toHaveLength(2);
    }
    const regionalContinents = BOARD.filter((space) => space.type === "special" && space.kind === "regional_choice").flatMap((space) => space.continents);
    expect(new Set(regionalContinents)).toEqual(new Set(CONTINENT_NAMES));
  });

  it("separates the two royalty exposures of every resource", () => {
    for (const resource of RESOURCES) {
      const indices = BOARD.map((space, index) => space.type === "asset" && ASSETS.find((asset) => asset.id === space.assetId)?.resourceId === resource.id ? index : -1).filter((index) => index >= 0);
      const direct = Math.abs(indices[0]! - indices[1]!);
      const circularDistance = Math.min(direct, BOARD.length - direct);
      expect(circularDistance, resource.name).toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps every country catalogue populated", () => {
    const counts = COUNTRIES.map((country) => ASSETS.filter((asset) => asset.countryId === country.id).length);
    expect(counts.filter((count) => count === 6)).toHaveLength(4);
    expect(counts.filter((count) => count === 5)).toHaveLength(24);
  });

  it("gives all fourteen Tendance cards an immediate economic effect", () => {
    expect(TREND_CARDS).toHaveLength(14);
    expect(TREND_CARDS.every((card) => card.amount > 0)).toBe(true);
    for (const card of TREND_CARDS) {
      expect(card.description.startsWith(card.bankDirection === "bank_to_player" ? "Recevez" : "Versez"), card.title).toBe(true);
    }
  });
});
