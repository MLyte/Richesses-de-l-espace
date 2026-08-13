<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ASSETS, COUNTRIES, RESOURCES, SECTORS, type BoardSpace } from "@richesses-espace/game";
import type { PublicPlayerView } from "@richesses-espace/protocol";
import PlayerTokenIcon from "./PlayerTokenIcon.vue";
import GameIcon from "./GameIcon.vue";

const props = defineProps<{
  board: readonly BoardSpace[];
  players: PublicPlayerView[];
  ownership: Record<string, string>;
  activePlayerId: string | null;
  visualPositions?: Record<string, number>;
}>();

const COLS = 24;
const ROWS = 17;
const ORIGIN_X = 0;
const ORIGIN_Y = 0;
const VIEW_HEIGHT = 100;
const boardRoot = ref<HTMLDivElement | null>(null);
const viewWidth = ref(226);
const tileWidth = computed(() => viewWidth.value / COLS);
const tileHeight = VIEW_HEIGHT / ROWS;

let resizeObserver: ResizeObserver | null = null;

function syncBoardRatio(): void {
  const bounds = boardRoot.value?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height) return;
  viewWidth.value = VIEW_HEIGHT * bounds.width / bounds.height;
}

onMounted(() => {
  syncBoardRatio();
  resizeObserver = new ResizeObserver(syncBoardRatio);
  if (boardRoot.value) resizeObserver.observe(boardRoot.value);
});
onBeforeUnmount(() => resizeObserver?.disconnect());

const continentColors: Record<string, string> = {
  "Système intérieur": "#F6C64D",
  "Ceinture rouge": "#F2674A",
  "Royaumes jovien et saturnien": "#8067E8",
  "Frontière solaire": "#35D0E2",
  "Voisinage d’Orion": "#6FAFE7",
  "Corridor des exoplanètes": "#C76EEB",
  "Lointains stellaires": "#EFAE5B"
};

function gridPosition(index: number) {
  let col = 0; let row = 0;
  if (index < COLS) { col = COLS - 1 - index; row = ROWS - 1; }
  else if (index < COLS + ROWS - 2) { col = 0; row = ROWS - 2 - (index - COLS); }
  else if (index < COLS * 2 + ROWS - 2) { col = index - (COLS + ROWS - 2); row = 0; }
  else { col = COLS - 1; row = index - (COLS * 2 + ROWS - 2) + 1; }
  return { x: ORIGIN_X + col * tileWidth.value, y: ORIGIN_Y + row * tileHeight };
}

const compactLabel = (value: string, length = 4) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, length).toUpperCase();
const playersAt = (index: number) => props.players.filter((player) => !player.mergedIntoId && (props.visualPositions?.[player.id] ?? player.position) === index);

function pawnPosition(index: number, offset: number, count: number) {
  const layer = Math.floor(offset / 3);
  const slot = offset % 3;
  const playersInLayer = Math.min(3, count - layer * 3);
  const tangentOffset = (slot - (playersInLayer - 1) / 2) * 2.05;
  const inwardOffset = layer * 1.6;

  // Tokens sit on the inner edge of their tile: they remain unmistakably attached
  // to the case without covering either of its two labels.
  if (index < COLS) return { x: tileWidth.value / 2 + tangentOffset, y: -inwardOffset };
  if (index < COLS + ROWS - 2) return { x: tileWidth.value + inwardOffset, y: tileHeight / 2 + tangentOffset };
  if (index < COLS * 2 + ROWS - 2) return { x: tileWidth.value / 2 + tangentOffset, y: tileHeight + inwardOffset };
  return { x: -inwardOffset, y: tileHeight / 2 + tangentOffset };
}

function specialMeta(space: BoardSpace) {
  if (space.type === "hub") return { code: "DÉPART", icon: "start", kind: "start" };
  if (space.type !== "special") return { code: "ESCALE", icon: "neutral", kind: "neutral" };
  if (space.kind === "auction") return { code: "MARCHÉ", icon: "auction", kind: "auction" };
  if (space.kind === "trend") return { code: "BALISE", icon: "trend", kind: "trend" };
  if (space.kind === "joker") return { code: "TECH", icon: "joker", kind: "joker" };
  if (space.kind === "dividend") return { code: compactLabel(RESOURCES.find((resource) => resource.id === space.resourceId)?.name ?? "PRIME", 6), icon: "dividend", kind: "dividend" };
  if (space.kind === "customs") return { code: "QUARANT.", icon: "customs", kind: "customs" };
  if (space.kind === "regional_choice") return { code: "SECTEUR", icon: "regional", kind: "regional" };
  if (space.kind === "global_choice") return { code: "GALAXIE", icon: "global", kind: "global" };
  return { code: "ESCALE", icon: "neutral", kind: "neutral" };
}

const tiles = computed(() => props.board.map((space, index) => {
  const position = gridPosition(index);
  if (space.type !== "asset") return { space, index, ...position, special: specialMeta(space), title: null, country: null, resource: null, sector: null, owner: null };
  const title = ASSETS.find((asset) => asset.id === space.assetId)!;
  const country = COUNTRIES.find((item) => item.id === title.countryId)!;
  const resource = RESOURCES.find((item) => item.id === title.resourceId)!;
  const sector = SECTORS.find((item) => item.id === title.sectorId)!;
  const owner = props.players.find((player) => player.id === props.ownership[space.assetId]) ?? null;
  return { space, index, ...position, special: null, title, country, resource, sector, owner };
}));
</script>

<template>
  <div ref="boardRoot" class="world-board world-board--tabletop">
    <svg :viewBox="`0 0 ${viewWidth} ${VIEW_HEIGHT}`" role="img" aria-label="Plateau stellaire Richesses de l’espace">
      <defs>
        <filter id="board-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy=".6" stdDeviation=".65" flood-color="#172423" flood-opacity=".18" /></filter>
        <radialGradient id="deep-space"><stop stop-color="#15344D" /><stop offset=".46" stop-color="#102A43" /><stop offset="1" stop-color="#06111F" /></radialGradient>
      </defs>

      <rect class="board-mat" :width="viewWidth" :height="VIEW_HEIGHT" />
      <rect class="board-ocean" :x="tileWidth" :y="tileHeight" :width="Math.max(0, viewWidth - tileWidth * 2)" :height="VIEW_HEIGHT - tileHeight * 2" rx="1" fill="url(#deep-space)" />

      <g v-for="tile in tiles" :key="tile.space.id" class="board-tile" :class="{ 'board-tile--owned': tile.owner, 'board-tile--occupied': playersAt(tile.index).length, 'board-tile--active': playersAt(tile.index).some(player => player.id === activePlayerId) }" :data-owner-id="tile.owner?.id" :transform="`translate(${tile.x} ${tile.y})`">
        <title v-if="tile.title">{{ tile.country?.continent }} · {{ tile.country?.name }} · {{ tile.resource?.name }}{{ tile.owner ? ` · Propriété de ${tile.owner.name}` : ' · Libre' }}</title>
        <title v-else>{{ tile.space.name }}</title>
        <template v-if="tile.title && tile.country && tile.resource && tile.sector">
          <rect class="tile-frame" :width="tileWidth" :height="tileHeight" rx=".08" />
          <rect class="tile-country" x=".06" y=".06" :width="Math.max(0, tileWidth - .12)" :height="tileHeight * .40" :fill="continentColors[tile.country.continent]" />
          <rect class="tile-resource" x=".06" :y="tileHeight * .46" :width="Math.max(0, tileWidth - .12)" :height="tileHeight * .48" :fill="tile.sector.color" />
          <rect v-if="tile.owner" class="tile-owner-glow" x=".65" y=".65" :width="Math.max(0, tileWidth - 1.3)" :height="Math.max(0, tileHeight - 1.3)" rx=".2" :stroke="tile.owner.color" />
          <rect v-if="tile.owner" class="tile-owner-marker" x=".28" y=".28" :width="Math.max(0, tileWidth - .56)" :height="Math.max(0, tileHeight - .56)" rx=".16" :stroke="tile.owner.color" />
          <text class="tile-country__code" :x="tileWidth / 2" :y="tileHeight * .20" text-anchor="middle">{{ compactLabel(tile.country.name, 6) }}</text>
          <text class="tile-resource__code" :x="tileWidth / 2" :y="tileHeight * .88" text-anchor="middle">{{ compactLabel(tile.resource.name, 6) }}</text>
        </template>
        <template v-else-if="tile.special">
          <rect class="tile-special" :class="`tile-special--${tile.special.kind}`" :width="tileWidth" :height="tileHeight" rx=".08" />
          <GameIcon class="tile-special__icon" :name="tile.special.icon" :x="tileWidth / 2 - .8" :y="tileHeight * .11" :size="1.6" :stroke-width="2.5" />

          <text class="tile-special__code" :x="tileWidth / 2" :y="tileHeight * .8" text-anchor="middle">{{ tile.special.code }}</text>
        </template>

        <g v-for="(player, offset) in playersAt(tile.index)" :key="player.id" class="tile-pawn" :data-player-id="player.id" :transform="`translate(${pawnPosition(tile.index, offset, playersAt(tile.index).length).x} ${pawnPosition(tile.index, offset, playersAt(tile.index).length).y})`">
          <circle class="pawn-glow" :class="{ active: player.id === activePlayerId }" r="1.72" :fill="player.color" />
          <circle class="pawn-shell" r="1.34" fill="#081f33" :stroke="player.color" />
          <circle class="pawn-active-ring" :class="{ active: player.id === activePlayerId }" r="1.5" />
          <PlayerTokenIcon class="pawn-symbol" :symbol="player.symbol" x="-.82" y="-.82" :size="1.64" :stroke-width="2.8" />

        </g>
      </g>
    </svg>
  </div>
</template>
