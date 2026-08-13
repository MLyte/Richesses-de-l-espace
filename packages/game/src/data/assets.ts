import type { SpaceConcession } from "../types";
import { PRODUCING_WORLDS } from "./countries";
import { COSMIC_RESOURCES } from "./resources";

const SHARES = [30, 25, 15, 10, 10, 10] as const;
const PRICES = [6, 5, 3, 2, 2, 2] as const;
const IMAGE_IDS = Array.from({ length: 20 }, (_, index) => `space-${String(index + 1).padStart(2, "0")}`);

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
    sharePercent,
    purchasePrice: PRICES[slot]!,
    imageId: IMAGE_IDS[(resourceIndex * 3 + slot) % IMAGE_IDS.length]!,
    // Alias de compatibilité interne avec les clients de protocole existants.
    countryId: world.id,
    hub: world.name,
    share: sharePercent,
    basePrice: PRICES[slot]!
  };
}));

/** @deprecated Use SPACE_CONCESSIONS. */
export const ASSETS = SPACE_CONCESSIONS;
