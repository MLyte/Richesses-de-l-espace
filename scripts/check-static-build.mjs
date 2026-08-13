import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("apps/client/dist-static");
const indexPath = path.join(dist, "index.html");
const index = await readFile(indexPath, "utf8");

if (!index.includes('href="/richesses-espace/favicon.svg"')) throw new Error("Le favicon n’utilise pas la base /richesses-espace/.");
if (!index.includes('src="/richesses-espace/assets/')) throw new Error("Le script principal n’utilise pas la base /richesses-espace/.");
if (!index.includes('href="/richesses-espace/assets/')) throw new Error("La feuille de style n’utilise pas la base /richesses-espace/.");
if (/(?:src|href)="\/assets\//.test(index)) throw new Error("Le build statique contient encore une ressource pointant vers /assets/ à la racine du domaine.");
if (!index.includes("aventure économique spatiale en solo contre ordinateur")) throw new Error("La description HTML n’annonce pas le mode solo.");
const buildId = index.match(/<meta name="richesses-build" content="([^"]+)"/i)?.[1];
if (!buildId) throw new Error("L’identifiant de build est absent de index.html.");
const buildDate = index.match(/<meta name="richesses-build-date" content="(\d{4}-\d{2}-\d{2})"/i)?.[1];
if (!buildDate) throw new Error("La date de build est absente de index.html.");

const assetFiles = await readdir(path.join(dist, "assets"));
const scriptName = assetFiles.find((name) => name.endsWith(".js"));
const styleName = assetFiles.find((name) => name.endsWith(".css"));
if (!scriptName || !styleName) throw new Error("Les fichiers JavaScript ou CSS compilés sont absents.");

const script = await readFile(path.join(dist, "assets", scriptName), "utf8");
const style = await readFile(path.join(dist, "assets", styleName), "utf8");
if (!script.includes("Joueur contre ordinateur")) throw new Error("Le mode joueur contre ordinateur n’est pas présent dans le bundle.");
if (!script.includes("robots aux identités aléatoires")) throw new Error("La présentation des robots locaux est absente.");
if (!script.includes("Votre pseudo")) throw new Error("Le formulaire d’identité du joueur est absent du bundle solo.");
if (!script.includes("Nombre de robots")) throw new Error("Le choix du nombre de robots est absent du bundle solo.");
if (!script.includes('"/richesses-espace/"')) throw new Error("La base publique /richesses-espace/ n’est pas intégrée au bundle JavaScript.");
if (!script.includes("cards/space-art-provenance.json")) throw new Error("Le manifeste visuel n’est pas référencé dans le bundle JavaScript.");
for (const obsoleteLabel of ["Démo UX", "Laboratoire UX statique", "Plusieurs situations sont disponibles"]) {
  if (script.includes(obsoleteLabel)) throw new Error(`L’ancien mode de démonstration est encore présent : ${obsoleteLabel}`);
}
if ([...style.matchAll(/url\((\/[^)]+)\)/g)].some((match) => !match[1].startsWith("/richesses-espace/"))) throw new Error("Une ressource CSS pointe encore vers la racine du domaine.");

for (const required of ["favicon.svg", "space-background.jpg", "cards/space-art-provenance.json"]) {
  const file = path.join(dist, ...required.split("/"));
  if (!(await stat(file)).isFile()) throw new Error(`Fichier statique absent : ${required}`);
}

console.log(`Build solo valide (${buildId}, version v${buildDate.replaceAll("-", ".")}) : base URL, joueur contre ordinateur et médias prêts pour /richesses-espace/.`);
