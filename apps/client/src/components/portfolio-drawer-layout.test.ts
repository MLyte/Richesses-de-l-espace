import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("../views/PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("mobile portfolio drawer layout", () => {
  it("replaces close with the game navigation in mobile-only mode", () => {
    expect(playerView.indexOf('active="resources"')).toBeGreaterThan(playerView.indexOf('class="portfolio-pager"'));
    expect(playerView).toContain('<button v-else class="portfolio-close"');
    expect(theme).not.toMatch(/\.portfolio-close\s*\{[^}]*position:\s*absolute/s);
  });

  it("scrolls the resource list instead of clipping its actions", () => {
    expect(theme).toMatch(/\.resource-score-list--drawer\s*\{[^}]*overflow-y:\s*auto/s);
    expect(theme).toMatch(/\.resource-score-list--drawer\s+\.resource-score\s*\{[^}]*overflow:\s*visible/s);
  });
});
