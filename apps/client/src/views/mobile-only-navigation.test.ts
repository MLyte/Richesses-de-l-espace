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

  it("keeps the player's credits compact in the header", () => {
    expect(playerView).toContain('class="phone-header__capital" role="status" aria-live="polite"');
    expect(playerView).toContain('`Capital disponible : ${store.me?.capital ?? 0} crédits`');
    expect(playerView).toContain('<strong>{{ store.me?.capital ?? 0 }}</strong>');
    expect(playerView).not.toContain('class="player-credit-float"');
    expect(theme).toMatch(/\.phone-header__capital\s*\{[^}]*display:\s*inline-flex[^}]*border-right:/s);
    expect(theme).toMatch(/\.mobile-map-panel--route\s*\{[^}]*padding-top:\s*\.75rem/s);
  });

  it("keeps roll contextual and shows the complete landing card over the route", () => {
    expect(playerView).toContain('action-card--roll mobile-map-overlay');
    expect(playerView).toContain('end-turn-action landing-result-overlay mobile-map-overlay');
    expect(playerView).toContain('v-else-if="mobileOnly && store.game.landedSpaceId" class="landing-result-overlay landing-result-overlay--spectator mobile-map-overlay"');
    expect(playerView).toContain('Résolution en cours sur le téléphone de');
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll\s*\{[^}]*position:\s*sticky[^}]*inset:\s*auto auto var\(--safe-bottom\)/s);
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll > :not\(\.dice-button\)[\s\S]*display:\s*none/s);
    expect(theme).toMatch(/\.controller-screen--map > \.landing-result-overlay\s*\{[^}]*position:\s*fixed[^}]*overflow-y:\s*auto/s);
    expect(theme).toContain(':not(.action-card--roll):not(.landing-result-overlay)');
    expect(theme).not.toContain('.end-turn-action > :not(div)');
  });

  it("shows the landed world's image during a classic purchase", () => {
    expect(playerView).toContain('<AssetCard v-if="store.game.pendingPurchase?.source === \'classic\'" :asset-id="pendingAsset.id" compact variant="mobile-summary" />');
  });

  it("offers home navigation and a new game from the final screen", () => {
    expect(playerView).toContain('v-else-if="store.game.phase === \'FINISHED\'" class="state-message final-phone mobile-map-overlay"');
    expect(playerView).toContain('class="secondary-button final-phone__home" @click="goHome"');
    expect(playerView).toContain('<span>Accueil</span>');
    expect(playerView).toContain('function goHome() { void router.push("/"); }');
    expect(playerView).toContain('v-if="isPhoneHost" type="button" class="primary-button final-phone__restart"');
    expect(playerView).toContain('@click="run(store.restart)"');
    expect(playerView).toContain("L’hôte peut préparer une nouvelle partie avec le même groupe.");
  });

  it("queues readable turn and event notifications without slowing game animations", () => {
    expect(playerView).toContain('<MobileToastQueue v-if="mobileNotificationEnabled" :event="mobileEventNotice" :turn-notice="mobileTurnNotice" :error="mobileErrorNotice"');
    expect(playerView).toContain('const quietMobileEventTypes = new Set(["dice_rolled", "pawn_moved", "turn_started", "player_joined", "player_ready"');
    expect(playerView).toContain('"ship_selected", "ship_race_started", "auction_bid"');
    expect(mobileToasts).toContain('createMobileToastQueue');
    expect(mobileToasts).toContain('class="mobile-notification-center"');
    expect(mobileToasts).toContain('class="mobile-notification-center__history"');
    expect(mobileToasts).toContain("state.unreadCount");
    expect(mobileToasts).toContain("@click=\"dismissCurrent\"");
    expect(theme).not.toContain('.phone-shell:has(.player-credit-float)');
  });

  it("closes host commands and resets mandatory-action scrolling", () => {
    expect(playerView).toContain('const hostMenuOpen = ref(false)');
    expect(playerView).toContain('function closeHostMenu()');
    expect(playerView).toContain('document.addEventListener("pointerdown", onDocumentPointerDown)');
    expect(playerView).toContain('if (event.key === "Escape") closeHostMenu()');
    expect(playerView).toContain('async function runHostCommand');
    expect(playerView).toContain('watch(mandatoryActionKey');
    expect(playerView).toContain('window.scrollTo({ top: 0, behavior: "auto" })');
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
    expect(mobileRoute).toContain("Révèle un Événement cosmique et applique immédiatement son effet");
    expect(mobileRoute).not.toContain("Une règle spéciale s’applique sur cette étape");
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
