import type { ResourceFamilyId, SpaceConcession } from "../types";
import { PRODUCING_WORLDS } from "./countries";
import { COSMIC_RESOURCES } from "./resources";

const SHARES = [30, 25, 15, 10, 10, 10] as const;
const PRICES = [6, 5, 3, 2, 2, 2] as const;
const IMAGE_IDS: Record<ResourceFamilyId, readonly string[]> = {
  minerals: ["space-01", "space-03", "space-07", "space-13"],
  biospheres: ["space-04", "space-06", "space-19", "space-20"],
  energies: ["space-09", "space-10", "space-11", "space-18"],
  volatiles: ["space-02", "space-05", "space-14", "space-16"],
  networks: ["space-08", "space-12", "space-15", "space-20"]
};

// Six concessions uniques par ressource, réparties sur six secteurs stellaires.
// Les parts et prix sont strictement ceux du référentiel économique gelé.
export const SPACE_CONCESSIONS: readonly SpaceConcession[] = COSMIC_RESOURCES.flatMap((resource, resourceIndex) => SHARES.map((sharePercent, slot) => {
  const world = PRODUCING_WORLDS[(resourceIndex + slot * 4) % PRODUCING_WORLDS.length]!;
  return {
    id: `${resource.id}-${world.id}`,
    name: `${resource.name} · ${world.name}`,
    worldId: world.id,
    systemId: world.systemId,
    stellarSectorId: world.sectorId,
    resourceId: resource.id,
    familyId: resource.familyId,
    sharePercent,
    purchasePrice: PRICES[slot]!,
    imageId: IMAGE_IDS[resource.familyId][(resourceIndex + slot) % 4]!,
    // Alias de compatibilité interne avec les clients de protocole existants.
    countryId: world.id,
    hub: world.name,
    sectorId: resource.familyId,
    share: sharePercent,
    basePrice: PRICES[slot]!
  };
}));

/** @deprecated Use SPACE_CONCESSIONS. */
export const ASSETS = SPACE_CONCESSIONS;
