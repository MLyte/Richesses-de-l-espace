import type { Asset, SectorId } from "../types";
import { COUNTRIES } from "./countries";
import { RESOURCES } from "./resources";

const SHARES = [30, 25, 15, 10, 10, 10] as const;
const PRICES = [6, 5, 3, 2, 2, 2] as const;
const IMAGE_IDS: Record<SectorId, readonly string[]> = {
  energy: ["energy-01", "energy-02", "energy-03", "energy-04", "energy-05"],
  metals: ["metals-01", "metals-02", "metals-03", "metals-04", "metals-05"],
  agriculture: ["agriculture-01", "agriculture-02", "agriculture-03", "agriculture-04", "agriculture-05"],
  biomaterials: ["biomaterials-01", "biomaterials-02", "biomaterials-03", "biomaterials-04", "biomaterials-05"]
};

// Six titres uniques par ressource, répartis sur six continents différents.
export const ASSETS: readonly Asset[] = RESOURCES.flatMap((resource, resourceIndex) => SHARES.map((share, slot) => {
  const country = COUNTRIES[(resourceIndex + slot * 4) % COUNTRIES.length]!;
  return {
    id: `${resource.id}-${country.id}`,
    name: `${resource.name} de ${country.name}`,
    countryId: country.id,
    hub: country.name,
    resourceId: resource.id,
    sectorId: resource.sectorId,
    share,
    basePrice: PRICES[slot]!,
    imageId: IMAGE_IDS[resource.sectorId][(resourceIndex + slot) % 5]!
  };
}));
