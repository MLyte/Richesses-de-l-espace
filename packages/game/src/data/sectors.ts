import type { ResourceFamily } from "../types";

export const RESOURCE_FAMILIES = [
  { id: "minerals", name: "Minéraux", shortName: "Minéraux", color: "#8067E8", icon: "crystal" },
  { id: "biospheres", name: "Biosphères", shortName: "Biosphères", color: "#35D0E2", icon: "leaf" },
  { id: "energies", name: "Énergies", shortName: "Énergies", color: "#F6C64D", icon: "spark" },
  { id: "volatiles", name: "Volatils", shortName: "Volatils", color: "#6FAFE7", icon: "fiber" },
  { id: "networks", name: "Réseaux", shortName: "Réseaux", color: "#F2674A", icon: "route" }
] as const satisfies readonly ResourceFamily[];

/** @deprecated Use RESOURCE_FAMILIES. */
export const SECTORS = RESOURCE_FAMILIES;
