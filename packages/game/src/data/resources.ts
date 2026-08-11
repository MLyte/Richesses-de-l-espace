import type { ResourceFamilyId } from "../types";

export interface CosmicResource { id: string; name: string; familyId: ResourceFamilyId; sectorId: ResourceFamilyId; royalties: { 30: number; 50: number; 70: number; 90: number } }
export type Resource = CosmicResource;

const resource = (id: string, name: string, familyId: ResourceFamilyId, level: number): Resource => ({
  id, name, familyId, sectorId: familyId,
  royalties: { 30: 1 + Math.floor(level / 3), 50: 4 + level, 70: 8 + level * 2, 90: 16 + level * 3 }
});

export const COSMIC_RESOURCES: readonly Resource[] = [
  resource("aluminous-regolith", "Régolithe aluminifère", "minerals", 0),
  resource("hydroponic-crops", "Cultures hydroponiques", "biospheres", 1),
  resource("xylem-fibers", "Fibres xylaires", "biospheres", 2),
  resource("carbon-nutrients", "Nutriments carbonés", "biospheres", 3),
  resource("synthetic-stimulants", "Stimulants synthétiques", "biospheres", 4),
  resource("dense-carbon", "Carbone dense", "minerals", 5),
  resource("stellar-cobalt", "Cobalt stellaire", "minerals", 0),
  resource("polymer-fibers", "Fibres polymères", "biospheres", 1),
  resource("orbital-copper", "Cuivre orbital", "minerals", 2),
  resource("ionic-winds", "Vents ioniques", "energies", 3),
  resource("meteoritic-iron", "Fer météoritique", "minerals", 4),
  resource("helium-3", "Hélium-3", "energies", 5),
  resource("water-ice", "Glace d’eau", "volatiles", 0),
  resource("biotextiles", "Biotextiles", "biospheres", 1),
  resource("algal-biomass", "Biomasse algale", "biospheres", 2),
  resource("cosmic-gold", "Or cosmique", "minerals", 3),
  resource("titan-hydrocarbons", "Hydrocarbures de Titan", "volatiles", 4),
  resource("heavy-metals", "Métaux lourds", "minerals", 5),
  resource("cellular-proteins", "Protéines cellulaires", "biospheres", 0),
  resource("photon-flux", "Flux photonique", "energies", 1),
  resource("biological-glucose", "Glucose biologique", "biospheres", 2),
  resource("orbital-aromatic-crops", "Cultures aromatiques orbitales", "biospheres", 3),
  resource("exploration-routes", "Routes d’exploration", "networks", 4),
  resource("fissile-isotopes", "Isotopes fissiles", "energies", 5)
];

/** @deprecated Use COSMIC_RESOURCES. */
export const RESOURCES = COSMIC_RESOURCES;
