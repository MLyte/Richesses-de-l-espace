import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("apps/client/dist");
const indexPath = path.join(dist, "index.html");
const index = await readFile(indexPath, "utf8");

if (!index.includes('href="/richesses-espace/favicon.svg"')) throw new Error("Le favicon n’utilise pas la base /richesses-espace/.");
if (!index.includes('src="/richesses-espace/assets/')) throw new Error("Le script principal n’utilise pas la base /richesses-espace/.");
if (!index.includes('href="/richesses-espace/assets/')) throw new Error("La feuille de style n’utilise pas la base /richesses-espace/.");

const assetFiles = await readdir(path.join(dist, "assets"));
const scriptName = assetFiles.find((name) => name.endsWith(".js"));
const styleName = assetFiles.find((name) => name.endsWith(".css"));
if (!scriptName || !styleName) throw new Error("Les fichiers JavaScript ou CSS compilés sont absents.");

const script = await readFile(path.join(dist, "assets", scriptName), "utf8");
const style = await readFile(path.join(dist, "assets", styleName), "utf8");
if (!script.includes("Laboratoire UX statique")) throw new Error("Le mode démo statique n’est pas présent dans le bundle.");
if (!script.includes("Aucune synchronisation entre appareils")) throw new Error("L’avertissement de démonstration est absent.");
if ([...style.matchAll(/url\((\/[^)]+)\)/g)].some((match) => !match[1].startsWith("/richesses-espace/"))) throw new Error("Une ressource CSS pointe encore vers la racine du domaine.");

for (const required of ["favicon.svg", "space-background.jpg", "cards/space-art-provenance.json"]) {
  const file = path.join(dist, ...required.split("/"));
  if (!(await stat(file)).isFile()) throw new Error(`Fichier statique absent : ${required}`);
}

console.log("Build statique valide : base URL, bundle UX et médias prêts pour /richesses-espace/.");
