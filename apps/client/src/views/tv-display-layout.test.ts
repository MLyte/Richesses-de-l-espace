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

  it("locks the shared display to the dynamic viewport in landscape", () => {
    expect(theme).toContain("@media (min-width: 1024px) and (orientation: landscape)");
    expect(theme).toMatch(/html:has\(\.display-shell\),[\s\S]*#app:has\(\.display-shell\)\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
    expect(theme).toMatch(/\.display-header--game ~ \.game-display\s*\{[^}]*height:\s*100dvh[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
    expect(theme).toMatch(/\.game-display > \.board-stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*height:\s*100%/s);
  });

  it("keeps landscape player wings inside the available height", () => {
    expect(theme).toMatch(/\.players-panel\s*\{[^}]*top:\s*var\(--tv-panel-top\)[^}]*bottom:\s*var\(--tv-content-bottom\)[^}]*height:\s*calc\(100% - var\(--tv-panel-top\) - var\(--tv-content-bottom\)\)[^}]*align-self:\s*stretch[^}]*overflow:\s*hidden/s);
    expect(theme).toMatch(/--tv-side-width:\s*clamp\(14rem, 26vw, 44rem\)/);
    expect(theme).toMatch(/--tv-center-width:\s*clamp\(22rem, 34vw, 54rem\)/);
    expect(theme).toMatch(/max-width:\s*1279px[\s\S]*\.players-panel \.player-holdings\s*\{\s*display:\s*none !important/);
  });

  it("keeps the lobby scroll-free on short TV viewports", () => {
    expect(theme).toContain("@media (min-width: 901px) and (max-height: 800px)");
    expect(theme).toMatch(/\.display-shell:not\(:has\(\.display-header--game\)\)\s*\{[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
    expect(theme).toMatch(/\.lobby-rules\s*\{\s*display:\s*none/);
  });

  it("makes the lobby header and content share exactly one viewport", () => {
    expect(theme).toMatch(/\.display-shell:not\(:has\(\.display-header--game\)\)\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)[^}]*height:\s*100dvh[^}]*overflow:\s*hidden/s);
    expect(theme).toMatch(/\.display-shell:not\(:has\(\.display-header--game\)\) > \.lobby-display\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0/s);
  });
});
