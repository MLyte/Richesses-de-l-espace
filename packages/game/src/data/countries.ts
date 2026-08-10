export interface Country { id: string; name: string; continent: string }

const CONTINENTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["Arc solaire", ["Solara", "Aurora", "Helia", "Lumera"]],
  ["Ceinture boréale", ["Boréal", "Verdia", "Nordrel", "Taïga"]],
  ["Méridies", ["Nacre", "Cinder", "Pelagia", "Andara"]],
  ["Orients", ["Hélios", "Orion", "Saphira", "Altara"]],
  ["Occidies", ["Aster", "Brumel", "Valoria", "Dorsale"]],
  ["Équatoria", ["Canopée", "Savana", "Delta", "Kivara"]],
  ["Australes", ["Tasmara", "Opaline", "Atollia", "Ventara"]]
];

const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const COUNTRIES: readonly Country[] = CONTINENTS.flatMap(([continent, names]) => names.map((name) => ({ id: slug(name), name, continent })));
export const CONTINENT_NAMES = CONTINENTS.map(([name]) => name);
