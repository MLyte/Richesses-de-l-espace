import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("assets/source/cards-space");
const output = path.resolve("apps/client/public/cards");
await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter((file) => /^space-\d{2}\.png$/.test(file));

for (const file of files) {
  const id = path.basename(file, ".png");
  const image = sharp(path.join(source, file)).rotate();
  for (const width of [480, 960, 1600]) {
    const suffix = width === 1600 ? "" : `-${width}`;
    const resize = { width, height: width, fit: "cover" };
    const webpQuality = width === 1600 ? 86 : 82;
    const avifQuality = width === 1600 ? 60 : 55;
    await image.clone().resize(resize).webp({ quality: webpQuality, effort: 4 }).toFile(path.join(output, `${id}${suffix}.webp`));
    await image.clone().resize(resize).avif({ quality: avifQuality, effort: 2 }).toFile(path.join(output, `${id}${suffix}.avif`));
  }
}
console.log(`${files.length} vues d’artiste spatiales optimisées en AVIF et WebP.`);
