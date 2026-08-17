import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("../views/PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("mobile portfolio drawer layout", () => {
  it("keeps a clear close action without recreating the removed game navigation", () => {
    expect(playerView).toContain('<button class="portfolio-close"');
    expect(playerView).not.toContain("MobileGameNavigation");
    expect(theme).not.toMatch(/\.portfolio-close\s*\{[^}]*position:\s*absolute/s);
  });

  it("uses one continuous scrolling resource page without pagination", () => {
    expect(theme).toMatch(/\.portfolio-drawer\s*\{[^}]*overflow-y:\s*auto/s);
    expect(theme).toMatch(/\.resource-score-list--drawer\s*\{[^}]*overflow-y:\s*visible/s);
    expect(theme).toMatch(/\.resource-score-list--drawer\s+\.resource-score\s*\{[^}]*overflow:\s*visible/s);
    expect(playerView).not.toContain("portfolioPage");
    expect(playerView).not.toContain("portfolio-pager");
  });

  it("keeps resource filters visible above the scrolling list", () => {
    expect(playerView).toContain('class="portfolio-drawer__sticky-top"');
    expect(playerView).toContain('v-model="portfolioSearch"');
    expect(playerView).toContain(":aria-pressed=\"portfolioRightsFilter === 'active'\"");
    expect(playerView).toContain('v-model="portfolioSort"');
    expect(playerView).toContain("Sans droits");
    expect(playerView).toContain("Droits actifs");
    expect(theme).toMatch(/\.portfolio-drawer__sticky-top\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s);
  });
});
