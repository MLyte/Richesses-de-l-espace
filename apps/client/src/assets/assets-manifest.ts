export interface LicensedImage {
  id: string;
  file: string;
  source: "generated";
  sourceUrl: string;
  author: string;
  authorUrl: string;
  licenseUrl: string;
  downloadedAt: string;
  classification: "artist_impression" | "scientific_photograph";
  generator: string;
  promptReference: string;
  alt: string;
  focalPoint: { x: number; y: number };
}

const descriptions = [
  "Astéroïdes minéraux traversés de veines cyan", "Atmosphère tourbillonnante d’une géante gazeuse", "Cristaux violets et cuivrés sur une surface extraterrestre", "Biosphères hydroponiques en orbite", "Relief glacé d’une lune lointaine",
  "Horizon rocheux sous une planète aux anneaux", "Régolithe poreux aux inclusions cyan", "Corridor orbital dans un champ d’astéroïdes", "Structure énergétique violette lumineuse", "Grand collecteur photonique orbital",
  "Flux énergétique bleu dans l’espace profond", "Anneau logistique autour d’un monde nocturne", "Pépites d’or cosmique en gros plan", "Exoplanète turquoise accompagnée de sa lune", "Astéroïde incandescent en fragmentation",
  "Monde volcanique rouge", "Ferme hydroponique dans une station orbitale", "Astéroïde de carbone dense", "Vortex stellaire corail et violet", "Réseau de stations autour d’une planète bleue"
] as const;

const publicAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const licensedImages: LicensedImage[] = descriptions.map((alt, index) => {
  const id = `space-${String(index + 1).padStart(2, "0")}`;
  return {
    id,
    file: publicAssetUrl(`cards/${id}.webp`),
    source: "generated",
    sourceUrl: publicAssetUrl("cards/space-art-provenance.json"),
    author: "OpenAI ImageGen, sous direction éditoriale du projet",
    authorUrl: "https://openai.com/",
    licenseUrl: "https://openai.com/policies/terms-of-use/",
    downloadedAt: "2026-08-10",
    classification: "artist_impression",
    generator: "OpenAI ImageGen intégré à Codex",
    promptReference: "space-atlas-v1",
    alt,
    focalPoint: { x: 50, y: 50 }
  };
});

export const imageById = new Map(licensedImages.map((image) => [image.id, image]));
