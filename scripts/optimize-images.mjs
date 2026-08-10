import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("assets/source/cards");
const output = path.resolve("apps/client/public/cards");
await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter((file) => file.endsWith(".jpg"));

for (const file of files) {
  const id = path.basename(file, ".jpg");
  const image = sharp(path.join(source, file)).rotate();
  for (const width of [480, 960, 1600]) {
    const suffix = width === 1600 ? "" : `-${width}`;
    const resize = { width, height: width, fit: "inside", withoutEnlargement: true };
    const webpQuality = width === 1600 ? 30 : width === 960 ? 42 : 50;
    const avifQuality = width === 1600 ? 26 : width === 960 ? 32 : 38;
    await image.clone().resize(resize).webp({ quality: webpQuality, effort: 5 }).toFile(path.join(output, `${id}${suffix}.webp`));
    await image.clone().resize(resize).avif({ quality: avifQuality, effort: 5 }).toFile(path.join(output, `${id}${suffix}.avif`));
  }
}
console.log(`${files.length} photographies optimisées en AVIF et WebP.`);
