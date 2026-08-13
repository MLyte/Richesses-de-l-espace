import type { ResourceFamilyId } from "../types";

export interface CosmicResource { id: string; name: string; familyId: ResourceFamilyId; sectorId: ResourceFamilyId; royalties: { 30: number; 50: number; 70: number; 90: number } }
export type Resource = CosmicResource;

const resource = (id: string, name: string, familyId: ResourceFamilyId, level: number): Resource => ({
  id, name, familyId, sectorId: familyId,
  royalties: { 30: 1 + Math.floor(level / 3), 50: 4 + level, 70: 8 + level * 2, 90: 16 + level * 3 }
});

export const COSMIC_RESOURCES: readonly Resource[] = [
  resource("aluminous-regolith", "Aluminium de régolithe", "minerals", 0),
  resource("hydroponic-crops", "Cultures hydroponiques", "biospheres", 1),
  resource("xylem-fibers", "Biofibres orbitales", "biospheres", 2),
  resource("carbon-nutrients", "Bionutriments orbitaux", "biospheres", 3),
  resource("synthetic-stimulants", "Biostimulants orbitaux", "biospheres", 4),
  resource("dense-carbon", "Carbone astéroïdal", "minerals", 5),
  resource("stellar-cobalt", "Cobalt astéroïdal", "minerals", 0),
  resource("polymer-fibers", "Fibres biosynthétiques", "biospheres", 1),
  resource("orbital-copper", "Cuivre orbital", "minerals", 2),
  resource("ionic-winds", "Courants ioniques", "energies", 3),
  resource("meteoritic-iron", "Fer météorique", "minerals", 4),
  resource("helium-3", "Hélium-3 stellaire", "energies", 5),
  resource("water-ice", "Glace cométaire", "volatiles", 0),
  resource("biotextiles", "Textiles biosynthétiques", "biospheres", 1),
  resource("algal-biomass", "Algues orbitales", "biospheres", 2),
  resource("cosmic-gold", "Or stellaire", "minerals", 3),
  resource("titan-hydrocarbons", "Hydrocarbures planétaires", "volatiles", 4),
  resource("heavy-metals", "Plomb astéroïdal", "minerals", 5),
  resource("cellular-proteins", "Bioprotéines orbitales", "biospheres", 0),
  resource("photon-flux", "Rayonnement stellaire", "energies", 1),
  resource("biological-glucose", "Biosucres orbitaux", "biospheres", 2),
  resource("orbital-aromatic-crops", "Aromates hydroponiques", "biospheres", 3),
  resource("exploration-routes", "Corridors interstellaires", "networks", 4),
  resource("fissile-isotopes", "Isotopes fissiles cosmiques", "energies", 5)
];

/** @deprecated Use COSMIC_RESOURCES. */
export const RESOURCES = COSMIC_RESOURCES;
