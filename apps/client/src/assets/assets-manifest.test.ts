import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { licensedImages } from "./assets-manifest";

describe("licensed card assets", () => {
  it("documents 20 distinct photographs", () => {
    expect(licensedImages).toHaveLength(20);
    expect(new Set(licensedImages.map((image) => image.sourceUrl)).size).toBe(20);
    expect(licensedImages.every((image) => image.author && image.licenseUrl)).toBe(true);
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
