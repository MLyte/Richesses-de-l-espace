import type { SpaceConcession } from "../types";
import { PRODUCING_WORLDS } from "./countries";
import { COSMIC_RESOURCES } from "./resources";

interface ConcessionProfile {
  shares: readonly [number, number, number, number, number, number];
  prices: readonly [number, number, number, number, number, number];
}

// Pourcentages et prix des 144 titres de la notice Richesses du Monde.
// L'unité monétaire de la notice est le million ; elle devient ici le crédit.
// Les totaux à 95 % sont intentionnels et reproduisent les valeurs imprimées.
export const REFERENCE_CONCESSION_PROFILES: Readonly<Record<string, ConcessionProfile>> = {
  Aluminium: { shares: [5, 5, 10, 10, 15, 45], prices: [0.5, 0.5, 1, 1, 1, 3.5] },
  Blé: { shares: [5, 10, 15, 15, 25, 30], prices: [0.5, 1, 1.5, 1.5, 2, 3] },
  Bois: { shares: [5, 10, 10, 20, 20, 35], prices: [0.5, 1, 1, 1.5, 1.5, 3] },
  Cacao: { shares: [5, 5, 10, 15, 30, 35], prices: [0.5, 0.5, 1, 1.5, 3, 3.5] },
  Café: { shares: [10, 10, 15, 15, 20, 30], prices: [1, 1, 1.5, 1.5, 2, 3] },
  Charbon: { shares: [5, 10, 10, 10, 20, 45], prices: [0.5, 1, 1, 1, 2, 3.5] },
  Cobalt: { shares: [5, 5, 10, 20, 25, 35], prices: [0.5, 0.5, 1, 2, 2.5, 5] },
  Coton: { shares: [5, 15, 15, 20, 20, 25], prices: [0.5, 1.5, 1.5, 2, 2, 2.5] },
  Cuivre: { shares: [5, 5, 10, 20, 20, 40], prices: [0.5, 0.5, 1, 2, 2, 3.5] },
  Éolien: { shares: [5, 10, 10, 20, 25, 30], prices: [0.5, 0.5, 0.5, 1.5, 2.5, 2.5] },
  Fer: { shares: [5, 10, 10, 20, 25, 30], prices: [0.5, 1, 1, 2, 2.5, 3] },
  Gaz: { shares: [5, 10, 15, 15, 25, 30], prices: [0.5, 1.5, 1.5, 1.5, 2, 2.5] },
  Hydraulique: { shares: [10, 10, 10, 10, 20, 40], prices: [0.5, 1, 1, 1, 2, 4] },
  Laine: { shares: [10, 10, 10, 10, 30, 30], prices: [1, 1, 1, 1, 3.5, 3.5] },
  Maïs: { shares: [5, 5, 15, 20, 25, 30], prices: [0.5, 0.5, 1.5, 2, 2.5, 3] },
  Or: { shares: [5, 5, 15, 20, 20, 30], prices: [0.5, 0.5, 1, 2, 2, 4.5] },
  Pétrole: { shares: [5, 10, 15, 20, 25, 25], prices: [0.5, 1, 1.5, 2.5, 3, 3] },
  Plomb: { shares: [5, 10, 10, 10, 25, 40], prices: [0.5, 0.5, 1, 1, 1.5, 3.5] },
  Riz: { shares: [10, 10, 10, 10, 30, 30], prices: [1, 1, 1, 1, 3.5, 3.5] },
  Solaire: { shares: [5, 10, 15, 20, 20, 25], prices: [0.5, 1, 1, 2, 2, 2] },
  Sucre: { shares: [5, 10, 15, 15, 25, 25], prices: [0.5, 2, 2, 2, 2.5, 2.5] },
  Thé: { shares: [5, 5, 10, 15, 30, 35], prices: [0.5, 0.5, 1, 1.5, 3, 3] },
  Tourisme: { shares: [10, 10, 15, 20, 20, 25], prices: [1, 1, 1, 2, 2, 2] },
  Uranium: { shares: [5, 10, 10, 15, 20, 40], prices: [0.5, 1, 1, 1, 2, 3] }
};

const IMAGE_IDS = Array.from({ length: 20 }, (_, index) => `space-${String(index + 1).padStart(2, "0")}`);

// Six concessions uniques par ressource, réparties sur six secteurs stellaires.
export const SPACE_CONCESSIONS: readonly SpaceConcession[] = COSMIC_RESOURCES.flatMap((resource, resourceIndex) => {
  const profile = REFERENCE_CONCESSION_PROFILES[resource.referenceName];
  if (!profile) throw new Error(`Profil de concessions manquant pour ${resource.referenceName}.`);

  return profile.shares.map((sharePercent, slot) => {
    const world = PRODUCING_WORLDS[(resourceIndex + slot * 4) % PRODUCING_WORLDS.length]!;
    const purchasePrice = profile.prices[slot]!;
    return {
      id: `${resource.id}-${world.id}`,
      name: `${resource.name} · ${world.name}`,
      worldId: world.id,
      systemId: world.systemId,
      stellarSectorId: world.sectorId,
      resourceId: resource.id,
      sharePercent,
      purchasePrice,
      imageId: IMAGE_IDS[(resourceIndex * 3 + slot) % IMAGE_IDS.length]!,
      // Alias de compatibilité interne avec les clients de protocole existants.
      countryId: world.id,
      hub: world.name,
      share: sharePercent,
      basePrice: purchasePrice
    };
  });
});

/** @deprecated Use SPACE_CONCESSIONS. */
export const ASSETS = SPACE_CONCESSIONS;
