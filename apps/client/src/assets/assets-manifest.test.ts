import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { licensedImages } from "./assets-manifest";

describe("licensed card assets", () => {
  it("documents 20 vues d’artiste distinctes avec leur provenance", () => {
    expect(licensedImages).toHaveLength(20);
    expect(new Set(licensedImages.map((image) => image.id)).size).toBe(20);
    expect(licensedImages.every((image) => image.author && image.licenseUrl && image.classification === "artist_impression" && image.promptReference)).toBe(true);
  });

  it("resolves card and provenance URLs from the configured application base", () => {
    expect(licensedImages[0]?.file).toBe(`${import.meta.env.BASE_URL}cards/space-01.webp`);
    expect(licensedImages[0]?.sourceUrl).toBe(`${import.meta.env.BASE_URL}cards/space-art-provenance.json`);
    expect(licensedImages.every((image) => image.file.startsWith(import.meta.env.BASE_URL))).toBe(true);
  });

  it("ships every responsive format within the size budget", () => {
    for (const image of licensedImages) {
      for (const suffix of ["-480", "-960", ""]) {
        for (const extension of ["webp", "avif"]) {
          const file = path.resolve("apps/client/public/cards", `${image.id}${suffix}.${extension}`);
          expect(fs.existsSync(file), file).toBe(true);
          expect(fs.statSync(file).size, file).toBeLessThanOrEqual(265_000);
        }
      }
    }
  });
});
