export interface CosmicResource { id: string; referenceName: string; name: string; royalties: { 30: number; 50: number; 70: number; 90: number } }
export type Resource = CosmicResource;

const resource = (id: string, referenceName: string, name: string, level: number): Resource => ({
  id, referenceName, name,
  royalties: { 30: 1 + Math.floor(level / 3), 50: 4 + level, 70: 8 + level * 2, 90: 16 + level * 3 }
});

export const COSMIC_RESOURCES: readonly Resource[] = [
  resource("aluminous-regolith", "Aluminium", "Aluminium de régolithe", 0),
  resource("hydroponic-crops", "Blé", "Blé hydroponique", 1),
  resource("xylem-fibers", "Bois", "Bois de biosphère", 2),
  resource("carbon-nutrients", "Cacao", "Cacao orbital", 3),
  resource("synthetic-stimulants", "Café", "Café orbital", 4),
  resource("dense-carbon", "Charbon", "Charbon astéroïdal", 5),
  resource("stellar-cobalt", "Cobalt", "Cobalt stellaire", 0),
  resource("polymer-fibers", "Coton", "Coton biosynthétique", 1),
  resource("orbital-copper", "Cuivre", "Cuivre orbital", 2),
  resource("ionic-winds", "Éolien", "Vents ioniques", 3),
  resource("meteoritic-iron", "Fer", "Fer météorique", 4),
  resource("helium-3", "Gaz", "Hélium-3 stellaire", 5),
  resource("water-ice", "Hydraulique", "Glace cométaire", 0),
  resource("biotextiles", "Laine", "Laine biosynthétique", 1),
  resource("algal-biomass", "Maïs", "Maïs hydroponique", 2),
  resource("cosmic-gold", "Or", "Or cosmique", 3),
  resource("titan-hydrocarbons", "Pétrole", "Hydrocarbures planétaires", 4),
  resource("heavy-metals", "Plomb", "Plomb astéroïdal", 5),
  resource("cellular-proteins", "Riz", "Riz hydroponique", 0),
  resource("photon-flux", "Solaire", "Rayonnement stellaire", 1),
  resource("biological-glucose", "Sucre", "Sucre de biosphère", 2),
  resource("orbital-aromatic-crops", "Thé", "Thé orbital", 3),
  resource("exploration-routes", "Tourisme", "Tourisme interstellaire", 4),
  resource("fissile-isotopes", "Uranium", "Isotopes fissiles", 5)
];

/** @deprecated Use COSMIC_RESOURCES. */
export const RESOURCES = COSMIC_RESOURCES;
