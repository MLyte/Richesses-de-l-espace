import type { Sector } from "../types";

export const SECTORS = [
  { id: "energy", name: "Énergie", shortName: "Énergie", color: "#b85f45", icon: "spark" },
  { id: "metals", name: "Métaux stratégiques", shortName: "Métaux", color: "#527287", icon: "crystal" },
  { id: "agriculture", name: "Cultures vivrières", shortName: "Cultures", color: "#73845d", icon: "leaf" },
  { id: "biomaterials", name: "Biomatériaux", shortName: "Matières", color: "#c09248", icon: "fiber" }
] as const satisfies readonly Sector[];
