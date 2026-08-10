import type { BoardSpace, SpecialSpaceKind } from "../types";
import { ASSETS } from "./assets";
import { COUNTRIES } from "./countries";
import { RESOURCES } from "./resources";
import { SECTORS } from "./sectors";

type SpaceSeed =
  | { id: string; type: "hub"; name: string }
  | { id: string; type: "asset"; assetId: string }
  | { id: string; type: "special"; kind: "dividend"; name: string; resourceId: string }
  | { id: string; type: "special"; kind: "regional_choice"; name: string; regionName: string; continents: string[] }
  | { id: string; type: "special"; kind: Exclude<SpecialSpaceKind, "dividend" | "regional_choice">; name: string };

const auctionIds = ["auction-north", "exchange-east", "auction-south", "auction-west"];
const auctionSpaces: SpaceSeed[] = ["boréale", "orientale", "australe", "occidentale"].map((region, index) => ({
  id: auctionIds[index]!,
  type: "special",
  kind: "auction",
  name: `Bourse ${region}`
}));

const trendSpaces: SpaceSeed[] = Array.from({ length: 6 }, (_, index) => ({
  id: index ? `trend-${index + 1}` : "observatory-north",
  type: "special" as const,
  kind: "trend" as const,
  name: `Tendance ${index + 1}`
}));

// Deux ressources par grande filière. Chaque case verse 0,5 crédit par point
// des dés, puis applique les royalties de la ressource indiquée.
const dividendResources = SECTORS.flatMap((sector) => RESOURCES.filter((resource) => resource.sectorId === sector.id).slice(0, 2));
const dividendSpaces: SpaceSeed[] = dividendResources.map((resource, index) => ({
  id: `dividend-${index + 1}`,
  type: "special",
  kind: "dividend",
  name: `Dividende · ${resource.name}`,
  resourceId: resource.id
}));

// Quatre comptoirs couvrent les sept continents fictifs du dataset.
const regionalSpaces: SpaceSeed[] = [
  { regionName: "Routes solaires", continents: ["Arc solaire", "Méridies"] },
  { regionName: "Routes boréales", continents: ["Ceinture boréale", "Occidies"] },
  { regionName: "Routes orientales", continents: ["Orients", "Équatoria"] },
  { regionName: "Routes australes", continents: ["Australes"] }
].map((region, index) => ({ id: `regional-choice-${index + 1}`, type: "special", kind: "regional_choice", name: `Comptoir · ${region.regionName}`, ...region }));

const globalSpaces: SpaceSeed[] = Array.from({ length: 2 }, (_, index) => ({ id: `global-choice-${index + 1}`, type: "special" as const, kind: "global_choice" as const, name: `Mandat global ${index + 1}` }));
const customsSpaces: SpaceSeed[] = Array.from({ length: 2 }, (_, index) => ({ id: `customs-${index + 1}`, type: "special" as const, kind: "customs" as const, name: `Contrôle douanier ${index + 1}` }));
const jokerSpaces: SpaceSeed[] = ["orientale", "occidentale", "australe"].map((region, index) => ({ id: index === 2 ? "harbor-south" : `joker-${index + 1}`, type: "special", kind: "joker", name: `Clause ${region}` }));
const specialSpaces = [...auctionSpaces, ...trendSpaces, ...dividendSpaces, ...regionalSpaces, ...globalSpaces, ...customsSpaces, ...jokerSpaces];

// Chaque ressource apparaît deux fois, mais ses occurrences sont séparées d’un
// demi-plateau plutôt que placées côte à côte.
const featuredByResource = RESOURCES.map((resource) => ASSETS.filter((asset) => asset.resourceId === resource.id).slice(0, 2));
const classicSpaces: SpaceSeed[] = [0, 1].flatMap((occurrence) => featuredByResource.map((titles, resourceIndex) => ({
  id: `classic-${RESOURCES[resourceIndex]!.id}-${occurrence + 1}`,
  type: "asset" as const,
  assetId: titles[occurrence]!.id
})));

const route: SpaceSeed[] = [{ id: "hub-zero", type: "hub", name: "Méridien central" }];
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
  countries: COUNTRIES.length
} as const;
