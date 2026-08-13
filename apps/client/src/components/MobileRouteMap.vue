<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ASSETS, RESOURCES, SECTORS, type BoardSpace } from "@richesses-espace/game";
import type { PublicPlayerView } from "@richesses-espace/protocol";
import { ChevronLeft, ChevronRight, LocateFixed, MapPin, Orbit } from "@lucide/vue";
import PlayerTokenIcon from "./PlayerTokenIcon.vue";

const props = defineProps<{
  board: readonly BoardSpace[];
  players: PublicPlayerView[];
  activePlayerId: string | null;
  currentPlayerId: string;
  turnNumber: number;
  ownership: Record<string, string>;
  visualPositions?: Record<string, number>;
}>();

const focusedIndex = ref(0);
const routeOrigin = ref(0);
const followsActivePlayer = ref(true);
const routeWindow = ref<HTMLElement | null>(null);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let scrollFrame = 0;
const activePlayer = computed(() => props.players.find((player) => player.id === props.activePlayerId) ?? null);
const activePosition = computed(() => activePlayer.value ? positionOf(activePlayer.value) : 0);

function positionOf(player: PublicPlayerView): number {
  return props.visualPositions?.[player.id] ?? player.position;
}

function wrap(index: number): number {
  return ((index % props.board.length) + props.board.length) % props.board.length;
}

function playersAt(index: number): PublicPlayerView[] {
  return props.players.filter((player) => !player.mergedIntoId && positionOf(player) === index);
}

const specialLabels: Record<string, string> = {
  auction: "Marché orbital",
  trend: "Balise cosmique",
  joker: "Station technologique",
  dividend: "Prime d’expédition",
  regional_choice: "Portail régional",
  global_choice: "Portail galactique",
  customs: "Quarantaine"
};

function routeEntry(index: number) {
  const normalizedIndex = wrap(index);
  const space = props.board[normalizedIndex]!;
  if (space.type === "asset") {
    const asset = ASSETS.find((item) => item.id === space.assetId);
    const resource = RESOURCES.find((item) => item.id === space.resourceId);
    const sector = SECTORS.find((item) => item.id === asset?.sectorId);
    const ownerId = props.ownership[space.assetId];
    const owner = props.players.find((player) => player.id === ownerId);
    return {
      index: normalizedIndex,
      title: asset?.name ?? "Concession spatiale",
      label: resource?.name ?? "Concession",
      detail: owner ? `Contrôlée par ${owner.name}` : `${asset?.share ?? 0} % disponibles · ${asset?.basePrice ?? 0} crédits`,
      color: sector?.color ?? "#35d0e2",
      owner,
      players: playersAt(normalizedIndex)
    };
  }
  if (space.type === "hub") {
    return { index: normalizedIndex, title: space.name, label: "Point de départ", detail: "Le centre logistique de toutes les expéditions", color: "#35d0e2", owner: null, players: playersAt(normalizedIndex) };
  }
  const resource = space.kind === "dividend" ? RESOURCES.find((item) => item.id === space.resourceId) : null;
  const sector = resource ? SECTORS.find((item) => item.id === resource.sectorId) : null;
  return {
    index: normalizedIndex,
    title: space.name,
    label: specialLabels[space.kind] ?? "Étape spéciale",
    detail: resource ? `Ressource concernée : ${resource.name}` : "Une règle spéciale s’applique sur cette étape",
    color: sector?.color ?? "#9666b4",
    owner: null,
    players: playersAt(normalizedIndex)
  };
}

const centeredEntries = computed(() => {
  const beforeCount = Math.floor(props.board.length / 2);
  return Array.from({ length: props.board.length }, (_, offset) => routeEntry(routeOrigin.value - beforeCount + offset));
});
const progress = computed(() => props.board.length ? ((focusedIndex.value + 1) / props.board.length) * 100 : 0);

async function scrollToIndex(index: number, behavior: ScrollBehavior): Promise<void> {
  focusedIndex.value = wrap(index);
  await nextTick();
  const target = routeWindow.value?.querySelector<HTMLElement>(`[data-board-index="${focusedIndex.value}"]`);
  target?.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : behavior });
}

function moveFocus(delta: number): void {
  followsActivePlayer.value = false;
  void scrollToIndex(focusedIndex.value + delta, "smooth");
}

function focusPlayer(player: PublicPlayerView): void {
  followsActivePlayer.value = player.id === props.activePlayerId;
  routeOrigin.value = positionOf(player);
  void scrollToIndex(positionOf(player), "smooth");
}

function recenter(): void {
  followsActivePlayer.value = true;
  routeOrigin.value = activePosition.value;
  void scrollToIndex(activePosition.value, "smooth");
}

function syncFocusedCase(): void {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(() => {
    const viewport = routeWindow.value;
    if (!viewport) return;
    const center = viewport.getBoundingClientRect().top + viewport.clientHeight / 2;
    const stops = [...viewport.querySelectorAll<HTMLElement>("[data-board-index]")];
    const closest = stops.reduce<HTMLElement | null>((best, stop) => {
      if (!best) return stop;
      const stopCenter = stop.getBoundingClientRect().top + stop.offsetHeight / 2;
      const bestCenter = best.getBoundingClientRect().top + best.offsetHeight / 2;
      return Math.abs(stopCenter - center) < Math.abs(bestCenter - center) ? stop : best;
    }, null);
    const index = Number(closest?.dataset.boardIndex);
    if (Number.isInteger(index)) focusedIndex.value = index;
  });
}

watch(() => [props.turnNumber, props.activePlayerId] as const, () => {
  followsActivePlayer.value = true;
  routeOrigin.value = activePosition.value;
  void scrollToIndex(activePosition.value, "auto");
}, { immediate: true, flush: "post" });

watch(activePosition, (position) => {
  if (followsActivePlayer.value) void scrollToIndex(position, "smooth");
});

onBeforeUnmount(() => cancelAnimationFrame(scrollFrame));
</script>

<template>
  <div class="mobile-route-map">
    <header class="route-header">
      <div>
        <span>Route orbitale</span>
        <strong>{{ activePlayer?.name ?? 'Expédition' }} est en mouvement</strong>
      </div>
      <button type="button" @click="recenter"><LocateFixed :size="17" aria-hidden="true" />Recentrer</button>
    </header>

    <div class="route-navigation">
      <button type="button" aria-label="Case précédente" @click="moveFocus(-1)"><ChevronLeft :size="22" aria-hidden="true" /></button>
      <div>
        <b>Case {{ focusedIndex + 1 }} <span>/ {{ board.length }}</span></b>
        <i><span :style="{ width: `${progress}%` }" /></i>
      </div>
      <button type="button" aria-label="Case suivante" @click="moveFocus(1)"><ChevronRight :size="22" aria-hidden="true" /></button>
    </div>

    <div ref="routeWindow" class="route-window" aria-label="Toutes les cases du circuit" tabindex="0" @scroll.passive="syncFocusedCase">
      <button
        v-for="entry in centeredEntries"
        :key="entry.index"
        type="button"
        class="route-stop"
        :class="{ focused: entry.index === focusedIndex, owned: entry.owner }"
        :data-board-index="entry.index"
        :data-owner-id="entry.owner?.id"
        :style="{ '--stop-color': entry.color, '--owner-color': entry.owner?.color }"
        @click="followsActivePlayer = false; scrollToIndex(entry.index, 'smooth')"
      >
        <span class="route-stop__number">{{ entry.index + 1 }}</span>
        <span class="route-stop__marker"><MapPin v-if="entry.index === focusedIndex" :size="19" aria-hidden="true" /><Orbit v-else :size="14" aria-hidden="true" /></span>
        <span class="route-stop__copy">
          <small>{{ entry.label }}</small>
          <strong>{{ entry.title }}</strong>
          <em v-if="entry.index === focusedIndex">{{ entry.detail }}</em>
        </span>
        <span v-if="entry.players.length" class="route-stop__players">
          <i v-for="player in entry.players" :key="player.id" :title="player.name" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>
        </span>
      </button>
    </div>

    <footer class="route-roster" aria-label="Position des joueurs">
      <button v-for="player in players" :key="player.id" type="button" :class="{ active: player.id === activePlayerId }" @click="focusPlayer(player)">
        <i :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>
        <span><b>{{ player.name }}<em v-if="player.id === currentPlayerId">Vous</em></b><small>Case {{ positionOf(player) + 1 }}</small></span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.mobile-route-map { display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: .65rem; height: 100%; min-height: 0; color: #f3f8fc; }
.route-header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.route-header > div { min-width: 0; }
.route-header span, .route-header strong { display: block; }
.route-header span { color: #6fddea; font: 700 .75rem "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .1em; }
.route-header strong { margin-top: .18rem; overflow: hidden; font-size: .92rem; text-overflow: ellipsis; white-space: nowrap; }
.route-header button { display: inline-flex; align-items: center; gap: .3rem; flex: 0 0 auto; min-height: 44px; padding: 0 .75rem; color: #d9edf5; border: 1px solid rgba(114, 169, 194, .55); border-radius: 999px; background: #0b2840; font-size: .8rem; font-weight: 800; }
.route-navigation { display: grid; grid-template-columns: 42px minmax(0, 1fr) 42px; align-items: center; gap: .65rem; }
.route-navigation > button { display: grid; place-items: center; width: 44px; height: 44px; color: #f3f8fc; border: 1px solid #72a9c2; border-radius: 12px; background: #153f5d; }
.route-navigation > div { min-width: 0; }
.route-navigation b { display: flex; justify-content: space-between; color: #f3f8fc; font: 700 .65rem "IBM Plex Mono", monospace; }
.route-navigation b span { color: #8fb6ca; font-weight: 600; }
.route-navigation i { display: block; height: 5px; margin-top: .4rem; overflow: hidden; border-radius: 999px; background: #102a43; }
.route-navigation i span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #2c7998, #35d0e2); transition: width .18s ease; }
.route-window { position: relative; display: grid; align-content: start; gap: .35rem; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: calc(50% - 44px) .08rem; scroll-behavior: smooth; scroll-snap-type: y proximity; scrollbar-color: #2c7998 transparent; scrollbar-width: thin; }
.route-window::before { position: absolute; z-index: 0; top: 0; bottom: 0; left: 36px; width: 2px; background: #2c7998; content: ""; }
.route-stop { position: relative; z-index: 1; display: grid; grid-template-columns: 25px 30px minmax(0, 1fr) auto; align-items: center; gap: .45rem; min-height: 52px; padding: .4rem .55rem; color: #c4dbe6; border: 1px solid rgba(114, 169, 194, .2); border-radius: 12px; background: rgba(7, 28, 48, .94); scroll-snap-align: center; text-align: left; transition: min-height .16s ease, background .16s ease, border-color .16s ease; }
.route-stop.owned { box-shadow: inset 0 0 0 2px var(--owner-color), inset 5px 0 16px color-mix(in srgb, var(--owner-color) 20%, transparent); }
.route-stop.focused { min-height: 96px; color: #f3f8fc; border-color: color-mix(in srgb, var(--stop-color) 72%, #ffffff 28%); background: linear-gradient(105deg, color-mix(in srgb, var(--stop-color) 18%, #071c30 82%), #0b2840); box-shadow: 0 10px 30px rgba(0, 0, 0, .24), inset 3px 0 0 var(--stop-color); }
.route-stop.owned.focused { box-shadow: 0 10px 30px rgba(0, 0, 0, .24), inset 0 0 0 2px var(--owner-color), inset 5px 0 16px color-mix(in srgb, var(--owner-color) 22%, transparent); }
.route-stop__number { color: #8fb6ca; font: 700 .75rem "IBM Plex Mono", monospace; text-align: right; }
.route-stop__marker { display: grid; place-items: center; width: 30px; height: 30px; color: var(--stop-color); border: 2px solid var(--stop-color); border-radius: 50%; background: #06111f; }
.focused .route-stop__marker { color: #06111f; background: var(--stop-color); box-shadow: 0 0 0 4px color-mix(in srgb, var(--stop-color) 20%, transparent); }
.route-stop__copy { min-width: 0; }
.route-stop__copy small, .route-stop__copy strong, .route-stop__copy em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.route-stop__copy small { color: #c9e8f4; font: 700 .875rem "IBM Plex Mono", monospace; text-transform: uppercase; letter-spacing: .04em; }
.route-stop__copy strong { margin-top: .15rem; font-size: .875rem; line-height: 1.25; }
.focused .route-stop__copy strong { font-size: 1rem; }
.route-stop__copy em { margin-top: .25rem; color: #c9e8f4; font-size: .75rem; font-style: normal; }
.route-stop.focused .route-stop__copy :is(small, strong, em) { overflow: visible; text-overflow: clip; white-space: normal; }
.route-stop__players { display: flex; padding-left: .25rem; }
.route-stop__players i, .route-roster > button > i { display: grid; place-items: center; width: 29px; height: 29px; margin-left: -5px; color: #07131f; border: 2px solid #eef8fa; border-radius: 50%; }
.route-stop__players i :deep(svg), .route-roster > button > i :deep(svg) { width: 17px; height: 17px; }
.route-roster { display: flex; gap: .45rem; overflow-x: auto; padding-bottom: .1rem; scrollbar-width: none; }
.route-roster > button { display: grid; grid-template-columns: 31px minmax(74px, auto); align-items: center; gap: .4rem; flex: 0 0 auto; min-height: 49px; padding: .35rem .55rem; color: #d9edf5; border: 1px solid rgba(114, 169, 194, .42); border-radius: 12px; background: #0b2840; text-align: left; }
.route-roster > button.active { border-color: #35d0e2; background: #153f5d; box-shadow: inset 0 0 0 1px rgba(53, 208, 226, .26); }
.route-roster > button > i { margin-left: 0; }
.route-roster span, .route-roster b, .route-roster small { display: block; }
.route-roster b { font-size: .8rem; }
.route-roster b em { margin-left: .28rem; color: #f6c64d; font-size: .65rem; font-style: normal; text-transform: uppercase; }
.route-roster small { margin-top: .12rem; color: #c9e8f4; font-size: .75rem; }
@media (max-height: 710px) {
  .mobile-route-map { gap: .4rem; }
  .route-stop { min-height: 45px; }
  .route-stop.focused { min-height: 72px; }
  .route-stop__copy em { display: none; }
}
</style>
