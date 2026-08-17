import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("apps/client/dist");
const deployRoot = path.resolve("deploy");
const destination = path.join(deployRoot, "richesses-espace");

if (path.dirname(destination) !== deployRoot || path.basename(destination) !== "richesses-espace") {
  throw new Error(`Destination de déploiement inattendue : ${destination}`);
}

await mkdir(deployRoot, { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });

console.log(`Dossier d’upload généré : ${destination}`);
