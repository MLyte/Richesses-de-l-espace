const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export interface SpaceRegion { id: string; name: string; color: string }
export interface PlanetarySystem { id: string; regionId: string; name: string }
export interface ProducingWorld { id: string; systemId: string; sectorId: string; name: string; kind: "planet" | "moon" | "dwarf_planet" | "asteroid" | "exoplanet"; continent: string }

const REGION_SEEDS = [
  ["inner-system", "Système intérieur", "Système solaire interne", "#F6C64D", [["Mercure", "planet"], ["Vénus", "planet"], ["Terre", "planet"], ["Lune", "moon"]]],
  ["red-belt", "Ceinture rouge", "Mars et ceinture principale", "#F2674A", [["Mars", "planet"], ["Cérès", "dwarf_planet"], ["Vesta", "asteroid"], ["Psyché", "asteroid"]]],
  ["giant-realms", "Royaumes jovien et saturnien", "Systèmes de Jupiter et Saturne", "#8067E8", [["Europe", "moon"], ["Ganymède", "moon"], ["Titan", "moon"], ["Encelade", "moon"]]],
  ["solar-frontier", "Frontière solaire", "Système solaire externe", "#35D0E2", [["Triton", "moon"], ["Pluton", "dwarf_planet"], ["Charon", "moon"], ["Éris", "dwarf_planet"]]],
  ["orion-neighborhood", "Voisinage d’Orion", "Étoiles proches", "#6FAFE7", [["Proxima Centauri b", "exoplanet"], ["Barnard b", "exoplanet"], ["LHS 1140 b", "exoplanet"], ["Gliese 667 Cc", "exoplanet"]]],
  ["exoplanet-corridor", "Corridor des exoplanètes", "Systèmes TRAPPIST et TOI", "#C76EEB", [["TRAPPIST-1 e", "exoplanet"], ["TRAPPIST-1 f", "exoplanet"], ["TRAPPIST-1 g", "exoplanet"], ["TOI-700 d", "exoplanet"]]],
  ["stellar-farlands", "Lointains stellaires", "Systèmes Kepler et autres", "#EFAE5B", [["Kepler-186 f", "exoplanet"], ["Kepler-452 b", "exoplanet"], ["K2-18 b", "exoplanet"], ["55 Cancri e", "exoplanet"]]]
] as const;

export const SPACE_REGIONS: readonly SpaceRegion[] = REGION_SEEDS.map(([id, name, , color]) => ({ id, name, color }));
export const PLANETARY_SYSTEMS: readonly PlanetarySystem[] = REGION_SEEDS.map(([regionId, , name]) => ({ id: `${regionId}-system`, regionId, name }));
export const PRODUCING_WORLDS: readonly ProducingWorld[] = REGION_SEEDS.flatMap(([sectorId, sectorName, , , worlds]) => worlds.map(([name, kind]) => ({ id: slug(name), name, kind, sectorId, systemId: `${sectorId}-system`, continent: sectorName })));

/** @deprecated Spatial compatibility aliases. */
export type Country = ProducingWorld;
export const COUNTRIES = PRODUCING_WORLDS;
export const CONTINENT_NAMES = SPACE_REGIONS.map(({ name }) => name);
