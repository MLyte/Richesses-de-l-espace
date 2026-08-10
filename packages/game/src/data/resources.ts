import type { SectorId } from "../types";

export interface Resource { id: string; name: string; sectorId: SectorId; royalties: { 30: number; 50: number; 70: number; 90: number } }

const resource = (id: string, name: string, sectorId: SectorId, level: number): Resource => ({
  id, name, sectorId,
  royalties: { 30: 1 + Math.floor(level / 3), 50: 4 + level, 70: 8 + level * 2, 90: 16 + level * 3 }
});

export const RESOURCES: readonly Resource[] = [
  resource("solar-flux", "Flux solaire", "energy", 0),
  resource("offshore-wind", "Vent hauturier", "energy", 1),
  resource("hydraulic", "Hydraulique", "energy", 2),
  resource("geothermal", "Géothermie", "energy", 3),
  resource("hydrogen", "Hydrogène", "energy", 4),
  resource("tidal", "Énergie marémotrice", "energy", 5),
  resource("aluminium", "Aluminium", "metals", 0),
  resource("copper", "Cuivre", "metals", 1),
  resource("iron", "Fer", "metals", 2),
  resource("lithium", "Lithium", "metals", 3),
  resource("cobalt", "Cobalt", "metals", 4),
  resource("uranium", "Uranium", "metals", 5),
  resource("wheat", "Blé", "agriculture", 0),
  resource("rice", "Riz", "agriculture", 1),
  resource("maize", "Maïs", "agriculture", 2),
  resource("cocoa", "Cacao", "agriculture", 3),
  resource("coffee", "Café", "agriculture", 4),
  resource("tea", "Thé", "agriculture", 5),
  resource("timber", "Bois", "biomaterials", 0),
  resource("cotton", "Coton", "biomaterials", 1),
  resource("hemp", "Chanvre", "biomaterials", 2),
  resource("wool", "Laine", "biomaterials", 3),
  resource("algae", "Algues", "biomaterials", 4),
  resource("natural-resins", "Résines naturelles", "biomaterials", 5)
];
