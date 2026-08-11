import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const display = readFileSync(fileURLToPath(new URL("./DisplayView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");
const tvLayout = theme.slice(theme.indexOf("/* Composition TV : zones réservées"));

describe("shared TV display layout", () => {
  it("labels every persistent surface as a distinct TV zone", () => {
    for (const zone of ["menu", "board", "turn", "dice", "context"]) expect(display).toContain(`data-tv-zone="${zone}"`);
    expect(display).toContain("'players-left'");
    expect(display).toContain("'players-right'");
  });

  it("places the player wings on opposite sides", () => {
    expect(theme).toMatch(/\.players-panel--left\s*\{[^}]*left:\s*calc\(var\(--tv-track-x\) \+ var\(--tv-zone-gap\)\)/s);
    expect(theme).toMatch(/\.players-panel--right\s*\{[^}]*right:\s*calc\(var\(--tv-track-x\) \+ var\(--tv-zone-gap\)\)/s);
    expect(theme).toMatch(/grid-template-rows:\s*auto repeat\(var\(--wing-player-count\), minmax\(0, 1fr\)\)/);
  });

  it("keeps player portfolios passive and scroll-free on the shared TV", () => {
    expect(display).toContain("visiblePortfolioResources(player.assetIds, wingPlayers.length)");
    expect(display).toContain("détails complets sur les téléphones");
    expect(theme).toMatch(/\.players-panel \.player-holdings\s*\{[^}]*overflow:\s*hidden/s);
    expect(theme).not.toMatch(/\.players-panel \.player-holdings\s*\{[^}]*overflow-y:\s*auto/s);
  });
  it("centres the journal and priority overlays between both player wings", () => {
    expect(theme).toMatch(/\.context-panel\s*\{[^}]*left:\s*50%[^}]*width:\s*var\(--tv-center-width\)[^}]*transform:\s*translateX\(-50%\)/s);
    expect(theme).toMatch(/\.pause-overlay,[\s\S]*\.card-reveal-common\s*\{[^}]*width:\s*var\(--tv-center-width\)[^}]*transform:\s*translate\(-50%, -50%\)/s);
  });

  it("keeps the decorative centre empty and reserves the lower rail for the dice", () => {
    expect(tvLayout).not.toContain(".world-board--tabletop .board-title");
    expect(tvLayout).toMatch(/\.board-stage \.dice-result\s*\{\s*bottom:\s*calc\(var\(--tv-track-y\) \+ var\(--tv-zone-gap\)\)/);
  });
});
