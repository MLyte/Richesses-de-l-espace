import type { BoardSpace, SpecialSpaceKind } from "../types";
import { SPACE_CONCESSIONS } from "./assets";
import { PRODUCING_WORLDS, SPACE_REGIONS } from "./countries";
import { COSMIC_RESOURCES } from "./resources";

type SpaceSeed =
  | { id: string; type: "hub"; name: string }
  | { id: string; type: "asset"; assetId: string; worldId: string; resourceId: string }
  | { id: string; type: "special"; kind: "dividend"; name: string; resourceId: string }
  | { id: string; type: "special"; kind: "regional_choice"; name: string; regionName: string; sectorIds: string[]; continents: string[] }
  | { id: string; type: "special"; kind: Exclude<SpecialSpaceKind, "dividend" | "regional_choice">; name: string };

const auctionIds = ["auction-north", "exchange-east", "auction-south", "auction-west"];
const auctionSpaces: SpaceSeed[] = ["boréale", "orientale", "australe", "occidentale"].map((region, index) => ({
  id: auctionIds[index]!,
  type: "special",
  kind: "auction",
  name: `Marché orbital ${index + 1}`
}));

const trendSpaces: SpaceSeed[] = Array.from({ length: 6 }, (_, index) => ({
  id: index ? `trend-${index + 1}` : "observatory-north",
  type: "special" as const,
  kind: "trend" as const,
  name: `Balise cosmique ${index + 1}`
}));

// Deux ressources par grande filière. Chaque case verse 0,5 crédit par point
// des dés, puis applique les royalties de la ressource indiquée.
const dividendResources = [0, 3, 6, 9, 12, 15, 18, 21].map((index) => COSMIC_RESOURCES[index]!);
const dividendSpaces: SpaceSeed[] = dividendResources.map((resource, index) => ({
  id: `dividend-${index + 1}`,
  type: "special",
  kind: "dividend",
  name: `Prime d’expédition · ${resource.name}`,
  resourceId: resource.id
}));

// Quatre portails couvrent les sept secteurs stellaires du référentiel.
const regionalSpaces: SpaceSeed[] = [
  { regionName: "Portail des mondes intérieurs", sectorIds: ["inner-system", "red-belt"] },
  { regionName: "Portail des géantes", sectorIds: ["giant-realms", "solar-frontier"] },
  { regionName: "Portail du voisinage", sectorIds: ["orion-neighborhood", "exoplanet-corridor"] },
  { regionName: "Portail des lointains", sectorIds: ["stellar-farlands"] }
].map((region, index) => ({ id: `regional-choice-${index + 1}`, type: "special", kind: "regional_choice", name: region.regionName, ...region, continents: region.sectorIds.map((id) => SPACE_REGIONS.find((item) => item.id === id)!.name) }));

const globalSpaces: SpaceSeed[] = Array.from({ length: 2 }, (_, index) => ({ id: `global-choice-${index + 1}`, type: "special" as const, kind: "global_choice" as const, name: `Portail galactique ${index + 1}` }));
const customsSpaces: SpaceSeed[] = Array.from({ length: 2 }, (_, index) => ({ id: `customs-${index + 1}`, type: "special" as const, kind: "customs" as const, name: `Quarantaine orbitale ${index + 1}` }));
const jokerSpaces: SpaceSeed[] = Array.from({ length: 3 }, (_, index) => ({ id: index === 2 ? "harbor-south" : `joker-${index + 1}`, type: "special" as const, kind: "joker" as const, name: `Station technologique ${index + 1}` }));
function distributeSpecialSpaces(groups: readonly (readonly SpaceSeed[])[]): SpaceSeed[] {
  const total = groups.reduce((sum, group) => sum + group.length, 0);
  const scores = groups.map(() => 0);
  const cursors = groups.map(() => 0);

  return Array.from({ length: total }, () => {
    for (let index = 0; index < groups.length; index += 1) scores[index]! += groups[index]!.length;
    let selected = -1;
    for (let index = 0; index < groups.length; index += 1) {
      if (cursors[index]! < groups[index]!.length && (selected < 0 || scores[index]! > scores[selected]!)) selected = index;
    }
    const selectedGroup = groups[selected];
    const cursor = cursors[selected] ?? 0;
    if (!selectedGroup) throw new Error("Unable to distribute special spaces");
    scores[selected] = scores[selected]! - total;
    cursors[selected] = cursor + 1;
    return selectedGroup[cursor]!;
  });
}

// Smooth weighted round-robin: every special family is spread around the whole
// circuit instead of occupying one contiguous quarter of the board.
const specialSpaces = distributeSpecialSpaces([auctionSpaces, trendSpaces, dividendSpaces, regionalSpaces, globalSpaces, customsSpaces, jokerSpaces]);

// Chaque ressource apparaît deux fois, mais ses occurrences sont séparées d’un
// demi-plateau plutôt que placées côte à côte.
const featuredByResource = COSMIC_RESOURCES.map((resource) => SPACE_CONCESSIONS.filter((asset) => asset.resourceId === resource.id).slice(0, 2));
const classicSpaces: SpaceSeed[] = [0, 1].flatMap((occurrence) => featuredByResource.map((titles, resourceIndex) => ({
  id: `classic-${COSMIC_RESOURCES[resourceIndex]!.id}-${occurrence + 1}`,
  type: "asset" as const,
  assetId: titles[occurrence]!.id,
  worldId: titles[occurrence]!.worldId,
  resourceId: titles[occurrence]!.resourceId
})));

const route: SpaceSeed[] = [{ id: "hub-zero", type: "hub", name: "Spatioport central" }];
classicSpaces.forEach((space, index) => {
  route.push(space);
  const specialsAtStep = specialSpaces.filter((_, specialIndex) => Math.floor(specialIndex * classicSpaces.length / specialSpaces.length) === index);
  route.push(...specialsAtStep);
});

export const BOARD: readonly BoardSpace[] = route.map((space, index) => {
  const angle = Math.PI + (index / route.length) * Math.PI * 2;
  return { ...space, x: 50 + Math.cos(angle) * 43, y: 50 + Math.sin(angle) * 39 } as BoardSpace;
});

export const BOARD_COUNTS = {
  total: BOARD.length,
  classic: classicSpaces.length,
  special: specialSpaces.length,
  countries: PRODUCING_WORLDS.length
} as const;
