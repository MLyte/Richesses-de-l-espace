import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");
const mobileRoute = readFileSync(fileURLToPath(new URL("../components/MobileRouteMap.vue", import.meta.url)), "utf8");
const mobileToasts = readFileSync(fileURLToPath(new URL("../components/MobileToastQueue.vue", import.meta.url)), "utf8");

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
    expect(theme).toMatch(/\.mobile-map-panel\s*\{[^}]*position:\s*relative[^}]*min-height:\s*calc\(var\(--app-viewport-height\)/s);
  });

  it("keeps the player's credits floating above the main map", () => {
    expect(playerView).toContain('class="player-credit-float" role="status" aria-live="polite"');
    expect(playerView).toContain('`Capital disponible : ${me.capital} crédits`');
    expect(playerView).toContain('<strong>{{ me.capital }}</strong>');
    expect(theme).toMatch(/\.player-credit-float\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*var\(--layer-floating\)[^}]*pointer-events:\s*none/s);
    expect(theme).toMatch(/\.mobile-map-panel--route\s*\{[^}]*padding-top:\s*4\.25rem/s);
    expect(theme).toContain(':not(.dice-animation-phone):not(.player-credit-float)');
  });

  it("renders roll and end-turn as contextual bottom actions", () => {
    expect(playerView).toContain('action-card--roll mobile-map-overlay');
    expect(playerView).toContain('end-turn-action mobile-map-overlay');
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll,[\s\S]*\.controller-screen--map > \.end-turn-action\s*\{[^}]*position:\s*sticky[^}]*inset:\s*auto auto var\(--safe-bottom\)/s);
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll > :not\(\.dice-button\)[\s\S]*display:\s*none/s);
    expect(theme).toMatch(/\.controller-screen--map:has\(> \.mobile-map-overlay:not\(\.action-card--roll\):not\(\.end-turn-action\)\) > \.mobile-map-panel\s*\{[^}]*display:\s*none/s);
  });

  it("offers a new game directly from the host's final screen", () => {
    expect(playerView).toContain('v-else-if="store.game.phase === \'FINISHED\'" class="state-message final-phone mobile-map-overlay"');
    expect(playerView).toContain('v-if="isPhoneHost" type="button" class="primary-button final-phone__restart"');
    expect(playerView).toContain('@click="run(store.restart)"');
    expect(playerView).toContain("L’hôte peut préparer une nouvelle partie avec le même groupe.");
  });

  it("queues readable turn and event notifications without slowing game animations", () => {
    expect(playerView).toContain('<MobileToastQueue v-if="mobileOnly" :event="mobileEventNotice" :turn-notice="mobileTurnNotice" />');
    expect(playerView).toContain('const quietMobileEventTypes = new Set(["dice_rolled", "pawn_moved", "turn_started", "player_joined", "player_ready"])');
    expect(mobileToasts).toContain('createMobileToastQueue');
    expect(mobileToasts).toContain('class="mobile-live-toast" role="status" aria-live="polite" aria-atomic="true"');
    expect(mobileToasts).toContain("+{{ state.pendingCount }}");
    expect(mobileToasts).toContain("@click=\"queue.dismiss\"");
    expect(mobileToasts).toMatch(/\.mobile-live-toast button\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
    expect(theme).toMatch(/\.phone-shell:has\(\.player-credit-float\) > \.mobile-live-toast\s*\{[^}]*top:\s*calc\(var\(--phone-header-height\)/s);
  });

  it("keeps errors visible without reserving a removed navigation dock", () => {
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) > \.error-toast\s*\{[^}]*z-index:\s*var\(--layer-toast\)/s);
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
    expect(mobileRoute).toContain('<span aria-hidden="true">₵</span>');
    expect(mobileRoute).toContain('{{ player.capital }}');
    expect(mobileRoute).toContain('<MapPin :size="12" aria-hidden="true" />');
    expect(mobileRoute).not.toContain('small>Case {{ positionOf(player) + 1 }}');
    expect(mobileRoute).not.toContain("WorldBoard");
  });

  it("keeps the focused route stop centered without width-based vertical padding", () => {
    expect(theme).toMatch(/\.mobile-map-panel--route\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*minmax\(0, 1fr\)[^}]*height:\s*calc\(var\(--app-viewport-height\)[^}]*overflow:\s*hidden/s);
    expect(mobileRoute).toContain("target.offsetTop - (viewport.clientHeight - target.offsetHeight) / 2");
    expect(mobileRoute).toContain("viewport.scrollTo({ top");
    expect(mobileRoute).toMatch(/\.route-window\s*\{[^}]*padding:\s*0 \.08rem/s);
    expect(mobileRoute).not.toContain("padding: calc(50% - 44px)");
    expect(mobileRoute).not.toContain("scrollIntoView");
  });
});
