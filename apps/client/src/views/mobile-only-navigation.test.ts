import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");
const mobileRoute = readFileSync(fileURLToPath(new URL("../components/MobileRouteMap.vue", import.meta.url)), "utf8");

describe("mobile-only map-first experience", () => {
  it("reuses the existing identity screen before a first solo game", () => {
    expect(playerView).toContain('v-if="!store.player" class="join-screen"');
    expect(playerView).toContain("Votre pseudo");
    expect(playerView).toContain('v-for="choice in PLAYER_COLORS"');
    expect(playerView).toContain('v-for="choice in PLAYER_SYMBOLS"');
    expect(playerView).toContain('@submit.prevent="join"');
  });

  it("uses the route as the permanent phone game surface", () => {
    expect(playerView).toContain('store.game?.displayMode === "MOBILE_ONLY"');
    expect(playerView).toContain('const mobileOnly = computed(() => store.game?.displayMode === "MOBILE_ONLY")');
    expect(playerView).not.toContain("route.query.demo");
    expect(playerView).toContain('searchParams.get("preview") === "mobile"');
    expect(playerView).toContain('await import("../demo/mobile-preview")');
    expect(playerView).toContain('v-if="mobileOnly" class="mobile-map-panel mobile-map-panel--route"');
    expect(playerView).toContain('<MobileRouteMap :board="store.game.board"');
    expect(playerView).not.toContain('<WorldBoard :board="store.game.board"');
    expect(playerView).not.toContain("mobilePanel");
    expect(playerView).not.toContain("MobileGameNavigation");
  });

  it("keeps resources permanently available without a bottom menu", () => {
    expect(playerView).toContain('class="phone-resource-button" @click="openPortfolio"');
    expect(playerView).toContain('<span>Ressources</span><b>{{ myAssets.length }}</b>');
    expect(playerView).toContain("{{ me.capital }}&nbsp;crédits");
    expect(theme).toMatch(/\.phone-resource-button\s*\{[^}]*min-height:\s*44px[^}]*background:\s*#124a68/s);
    expect(theme).toMatch(/\.mobile-map-panel\s*\{[^}]*bottom:\s*env\(safe-area-inset-bottom\)/s);
  });

  it("renders roll and end-turn as contextual bottom actions", () => {
    expect(playerView).toContain('action-card--roll mobile-map-overlay');
    expect(playerView).toContain('end-turn-action mobile-map-overlay');
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll,[\s\S]*\.controller-screen--map > \.end-turn-action\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*calc\(\.75rem/s);
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll > :not\(\.dice-button\)[\s\S]*display:\s*none/s);
  });

  it("shows turn and event information as ephemeral live notifications", () => {
    expect(playerView).toContain('const mobileLiveNotice = computed(() => store.animatedEvent?.message ?? turnToast.value)');
    expect(playerView).toContain('class="mobile-live-toast" role="status" aria-live="polite"');
    expect(playerView).toContain('turnToastTimer = window.setTimeout(() => { turnToast.value = null; }, 2800)');
    expect(playerView).toContain('watch(() => store.animatedEvent?.id ?? null');
    expect(theme).toMatch(/\.mobile-live-toast\s*\{[^}]*pointer-events:\s*none/s);
  });

  it("keeps errors visible without reserving a removed navigation dock", () => {
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) > \.error-toast\s*\{[^}]*z-index:\s*90/s);
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) > \.error-toast\s*\{[^}]*bottom:\s*calc\(1rem/s);
  });

  it("moves optional transactions and technologies into the resources drawer", () => {
    expect(playerView).toContain('class="portfolio-actions" aria-label="Transferts de concessions"');
    expect(playerView).toContain('class="lever-hand lever-hand--portfolio"');
    expect(playerView).toContain('v-if="!mobileOnly && allowed(\'PROPOSE_TRADE\') && tradeTargets.length"');
    expect(theme).toMatch(/\.portfolio-actions \.title-actions__grid-four\s*\{[^}]*grid-template-columns:\s*repeat\(4/s);
  });

  it("lists the whole route around the player and recenters at turn start", () => {
    expect(mobileRoute).toContain("Route orbitale");
    expect(mobileRoute).toContain("Array.from({ length: props.board.length }");
    expect(mobileRoute).toContain("routeOrigin.value - beforeCount + offset");
    expect(mobileRoute).toContain("Case {{ focusedIndex + 1 }}");
    expect(mobileRoute).toContain('behavior: reducedMotion.matches ? "auto" : behavior');
    expect(mobileRoute).toContain("props.turnNumber, props.activePlayerId");
    expect(mobileRoute).toContain('@click="focusPlayer(player)"');
    expect(mobileRoute).toContain('v-for="player in players"');
    expect(mobileRoute).toContain('v-for="player in entry.players"');
    expect(mobileRoute).not.toContain("WorldBoard");
  });
});
