import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");
const board = readFileSync(fileURLToPath(new URL("../components/WorldBoard.vue", import.meta.url)), "utf8");

describe("mobile-only game navigation", () => {
  it("separates the phone-only map from the TV controller experience", () => {
    expect(playerView).toContain('store.game?.displayMode === "MOBILE_ONLY"');
    expect(playerView).toContain('v-if="mobileOnly && mobilePanel === \'map\'"');
    expect(playerView).toContain('<WorldBoard :board="store.game.board"');
    expect(playerView).toContain("mobileOnly ? 'La carte suit les mouvements de toute la flotte.' : 'Suivez les mouvements sur l’écran commun.'");
  });

  it("offers play, map and resources without covering mandatory actions", () => {
    expect(playerView).toContain('class="mobile-only-navigation"');
    expect(playerView).toContain("<span>Jouer</span>");
    expect(playerView).toContain("<span>Carte</span>");
    expect(playerView).toContain("<span>Ressources</span>");
    expect(theme).toMatch(/\.controller-screen--mobile-only \.dice-button[\s\S]*bottom:\s*calc\(5\.4rem/);
  });

  it("exposes player markers so the mobile viewport can recenter them", () => {
    expect(board).toContain(':data-player-id="player.id"');
    expect(playerView).toContain("centerMobileMap(player.id)");
  });
});
