import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");
const mobileRoute = readFileSync(fileURLToPath(new URL("../components/MobileRouteMap.vue", import.meta.url)), "utf8");
const mobileNavigation = readFileSync(fileURLToPath(new URL("../components/MobileGameNavigation.vue", import.meta.url)), "utf8");

describe("mobile-only game navigation", () => {
  it("separates the phone-only map from the TV controller experience", () => {
    expect(playerView).toContain('store.game?.displayMode === "MOBILE_ONLY"');
    expect(playerView).toContain('const mobileOnly = computed(() => store.game?.displayMode === "MOBILE_ONLY")');
    expect(playerView).not.toContain("route.query.demo");
    expect(playerView).toContain('searchParams.get("preview") === "mobile"');
    expect(playerView).toContain('await import("../demo/mobile-preview")');
    expect(playerView).toContain('v-if="mobileOnly && mobilePanel === \'map\'"');
    expect(playerView).toContain('<MobileRouteMap :board="store.game.board"');
    expect(playerView).not.toContain('<WorldBoard :board="store.game.board"');
    expect(playerView).toContain("mobileOnly ? 'La carte suit les mouvements de toute la flotte.' : 'Suivez les mouvements sur l’écran commun.'");
  });

  it("offers play, map and resources without covering mandatory actions", () => {
    expect(playerView).toContain("<MobileGameNavigation");
    expect(mobileNavigation).toContain('class="mobile-only-navigation"');
    expect(mobileNavigation).toContain("<span>Jouer</span>");
    expect(mobileNavigation).toContain("<span>Carte</span>");
    expect(mobileNavigation).toContain("<span>Ressources</span>");
    expect(theme).toMatch(/\.controller-screen--mobile-only \.dice-button[\s\S]*bottom:\s*calc\(5\.4rem/);
  });

  it("does not reserve an empty fixed-action row when end turn is inline", () => {
    expect(playerView).toContain('const hasFixedPrimaryTurnAction = computed(() => allowed("ROLL_DICE") || (!mobileOnly.value && allowed("END_TURN")))');
    expect(playerView).toContain("'title-actions--with-primary': hasFixedPrimaryTurnAction");
  });

  it("keeps error toasts visible above the bottom navigation", () => {
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) > \.error-toast\s*\{[^}]*z-index:\s*90/s);
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) > \.error-toast\s*\{[^}]*bottom:\s*calc\(5\.4rem/s);
  });

  it("keeps the bottom navigation visible on the resources page", () => {
    expect(playerView).toContain('v-if="mobileOnly" active="resources"');
    expect(playerView).toContain('@play="showMobilePlay" @map="showMobileMap"');
    expect(mobileNavigation).toContain("active === 'resources'");
    expect(theme).toMatch(/\.portfolio-drawer\.portfolio-drawer--with-navigation\s*\{[^}]*padding-bottom:\s*calc\(5\.4rem/s);
  });

  it("lists the whole route around the player and recenters at turn start", () => {
    expect(mobileRoute).toContain("Route orbitale");
    expect(mobileRoute).toContain("Array.from({ length: props.board.length }");
    expect(mobileRoute).toContain("routeOrigin.value - beforeCount + offset");
    expect(mobileRoute).toContain("Case {{ focusedIndex + 1 }}");
    expect(mobileRoute).toContain('scrollIntoView({ block: "center", behavior })');
    expect(mobileRoute).toContain("props.turnNumber, props.activePlayerId");
    expect(mobileRoute).toContain('@click="focusPlayer(player)"');
    expect(mobileRoute).not.toContain("WorldBoard");
  });
});
