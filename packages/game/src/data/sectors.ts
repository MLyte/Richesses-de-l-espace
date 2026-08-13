import type { ResourceFamily } from "../types";

export const RESOURCE_FAMILIES = [
  { id: "minerals", name: "Minerais stellaires", shortName: "Minerais", color: "#8067E8", icon: "crystal" },
  { id: "biospheres", name: "Bioressources orbitales", shortName: "Bioressources", color: "#35D0E2", icon: "leaf" },
  { id: "energies", name: "Énergies cosmiques", shortName: "Énergies", color: "#F6C64D", icon: "spark" },
  { id: "volatiles", name: "Glaces et carburants cosmiques", shortName: "Glaces et carburants", color: "#6FAFE7", icon: "fiber" },
  { id: "networks", name: "Exploration galactique", shortName: "Exploration", color: "#F2674A", icon: "route" }
] as const satisfies readonly ResourceFamily[];

/** @deprecated Use RESOURCE_FAMILIES. */
export const SECTORS = RESOURCE_FAMILIES;
