import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/crop-space-atlas.mjs <atlas.png>");

const sourceDir = path.resolve("assets/source/cards-space");
const publicDir = path.resolve("apps/client/public/cards");
await fs.mkdir(sourceDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });

const atlasBuffer = await sharp(input).extract({ left: 1, top: 1, width: 1400, height: 1120 }).png().toBuffer();
await sharp(atlasBuffer).png({ compressionLevel: 9 }).toFile(path.join(sourceDir, "space-atlas.png"));

for (let index = 0; index < 20; index += 1) {
  const id = `space-${String(index + 1).padStart(2, "0")}`;
  const left = (index % 5) * 280;
  const top = Math.floor(index / 5) * 280;
  const tile = sharp(atlasBuffer).extract({ left, top, width: 280, height: 280 });
  await tile.clone().png({ compressionLevel: 9 }).toFile(path.join(sourceDir, `${id}.png`));
  for (const width of [480, 960, 1600]) {
    const suffix = width === 1600 ? "" : `-${width}`;
    const resized = tile.clone().resize(width, width, { fit: "cover", kernel: "lanczos3" });
    await resized.clone().webp({ quality: width === 1600 ? 86 : 82, effort: 4 }).toFile(path.join(publicDir, `${id}${suffix}.webp`));
    await resized.clone().avif({ quality: width === 1600 ? 60 : 55, effort: 2 }).toFile(path.join(publicDir, `${id}${suffix}.avif`));
  }
}

console.log("20 scènes spatiales exportées en PNG source, AVIF et WebP.");
