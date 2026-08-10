export interface LicensedImage {
  id: string; file: string; source: "unsplash"; sourceUrl: string;
  author: string; authorUrl: string; licenseUrl: string; downloadedAt: string;
  alt: string; focalPoint: { x: number; y: number };
}

const licenseUrl = "https://unsplash.com/license";
const downloadedAt = "2026-08-09";

export const licensedImages: LicensedImage[] = [
  ["energy-01", "VHlrCYpJGEY", "Jon Flobrant", "jonflobrant", "Éoliennes au bord de l’eau"],
  ["energy-02", "8gjMwPIoji4", "Venti Views", "ventiviews", "Éoliennes dans une lumière dorée"],
  ["energy-03", "1CbcMXp8r3Q", "Greg Bulla", "gregbulla", "Parc éolien sur une plaine"],
  ["energy-04", "1J4a11wNRVA", "Markus Spiske", "markusspiske", "Éoliennes sous un ciel nuageux"],
  ["energy-05", "CmhJPJ_E9tQ", "Lacyec", "lacyec", "Éoliennes dans un paysage rural"],
  ["metals-01", "jmlAozIDeHg", "Albert Hyseni", "alberthyseni", "Minéraux métalliques en gros plan"],
  ["metals-02", "YtY64RB3DFw", "Rafael Zamora", "rafazamoo", "Cristal minéral sombre"],
  ["metals-03", "AFKX0ei32lA", "remapstudio", "remapstudio", "Surface métallique texturée"],
  ["metals-04", "dc2bBZP0O0U", "Shahabudin Ibragimov", "sb_dn", "Surface de cuivre patinée"],
  ["metals-05", "zThV7iFEc9U", "Mr. Pugo", "mrpugo", "Cristal de quartz en gros plan"],
  ["agriculture-01", "EEYeXlO2vkQ", "安 崔士", "treesan", "Parcelles agricoles vues du ciel"],
  ["agriculture-02", "2OYgrZAmvMA", "Francesco Ungaro", "francesco_ungaro", "Cultures géométriques vues du ciel"],
  ["agriculture-03", "1nbpbEaNKr8", "Martin Förster", "martinfoersterphotography", "Champ travaillé vu du ciel"],
  ["agriculture-04", "heMxputJ4sk", "Bernd Dittrich", "hdbernd", "Parcelles vertes et terreuses"],
  ["agriculture-05", "hnpRPJ6uvFs", "Bernd Dittrich", "hdbernd", "Rangées de cultures maraîchères"],
  ["biomaterials-01", "N8CouWLRJ7o", "Sawyer Bergeron", "sbergeron", "Veines naturelles du bois"],
  ["biomaterials-02", "yNlKG8EBqrM", "Stefan Sebök", "algenprojekt", "Algues cultivées sous l’eau"],
  ["biomaterials-03", "bH6wt8WikcQ", "Jonathan Borba", "jonathanborba", "Fibres naturelles tressées"],
  ["biomaterials-04", "-5_oCbECmLo", "Valentin", "omikron", "Tressage de fibres brunes"],
  ["biomaterials-05", "wGNRn0HSqiw", "Saifee Art", "saifee_art", "Texture de fibres naturelles"]
].map(([id, photoId, author, handle, alt]) => ({
  id: id!, file: `/cards/${id}.webp`, source: "unsplash" as const,
  sourceUrl: `https://unsplash.com/photos/${photoId}`,
  author: author!, authorUrl: `https://unsplash.com/@${handle}`,
  licenseUrl, downloadedAt, alt: alt!, focalPoint: { x: 50, y: 50 }
}));

export const imageById = new Map(licensedImages.map((image) => [image.id, image]));
