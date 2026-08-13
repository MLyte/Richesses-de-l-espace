import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(root, "apps", "client", "public");
const source = path.join(publicDirectory, "favicon.svg");

await Promise.all([
  sharp(source).resize(180, 180).png().toFile(path.join(publicDirectory, "apple-touch-icon.png")),
  sharp(source).resize(192, 192).png().toFile(path.join(publicDirectory, "pwa-192x192.png")),
  sharp(source).resize(512, 512).png().toFile(path.join(publicDirectory, "pwa-512x512.png")),
  sharp(source)
    .resize(410, 410)
    .extend({ top: 51, right: 51, bottom: 51, left: 51, background: "#06111f" })
    .png()
    .toFile(path.join(publicDirectory, "pwa-512x512-maskable.png"))
]);
