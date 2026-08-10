<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ASSETS, COUNTRIES, RESOURCES, SECTORS, type BoardSpace } from "@orbisium/game";
import type { PublicPlayerView } from "@orbisium/protocol";
import PlayerTokenIcon from "./PlayerTokenIcon.vue";
import GameIcon from "./GameIcon.vue";

const props = defineProps<{ board: readonly BoardSpace[]; players: PublicPlayerView[]; activePlayerId: string | null; visualPositions?: Record<string, number> }>();

const COLS = 21;
const ROWS = 20;
const ORIGIN_X = 0;
const ORIGIN_Y = 0;
const VIEW_HEIGHT = 100;
const boardRoot = ref<HTMLDivElement | null>(null);
const viewWidth = ref(226);
const tileWidth = computed(() => viewWidth.value / COLS);
const tileHeight = VIEW_HEIGHT / ROWS;
const centerX = computed(() => viewWidth.value / 2);
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
  "Arc solaire": "#e8b84e",
  "Ceinture boréale": "#8aa56e",
  Méridies: "#d56d55",
  Orients: "#6e91aa",
  Occidies: "#9a7ab5",
  Équatoria: "#4f9f89",
  Australes: "#db8daf"
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
const playersAt = (index: number) => props.players.filter((player) => (props.visualPositions?.[player.id] ?? player.position) === index);

function pawnPosition(index: number, offset: number, count: number) {
  const layer = Math.floor(offset / 3);
  const slot = offset % 3;
  const playersInLayer = Math.min(3, count - layer * 3);
  const tangentOffset = (slot - (playersInLayer - 1) / 2) * 2.35;
  const inwardOffset = layer * 1.65;

  // The pawn straddles the inside edge of the track. This keeps both tile
  // labels readable while making a group of players visible from a distance.
  if (index < COLS) return { x: tileWidth.value / 2 + tangentOffset, y: -inwardOffset };
  if (index < COLS + ROWS - 2) return { x: tileWidth.value + inwardOffset, y: tileHeight / 2 + tangentOffset };
  if (index < COLS * 2 + ROWS - 2) return { x: tileWidth.value / 2 + tangentOffset, y: tileHeight + inwardOffset };
  return { x: -inwardOffset, y: tileHeight / 2 + tangentOffset };
}

function specialMeta(space: BoardSpace) {
  if (space.type === "hub") return { code: "DÉPART", icon: "start", kind: "start" };
  if (space.type !== "special") return { code: "ESCALE", icon: "neutral", kind: "neutral" };
  if (space.kind === "auction") return { code: "BOURSE", icon: "auction", kind: "auction" };
  if (space.kind === "trend") return { code: "TENDANCE", icon: "trend", kind: "trend" };
  if (space.kind === "joker") return { code: "JOKER", icon: "joker", kind: "joker" };
  if (space.kind === "dividend") return { code: compactLabel(RESOURCES.find((resource) => resource.id === space.resourceId)?.name ?? "DIVIDENDE", 6), icon: "dividend", kind: "dividend" };
  if (space.kind === "customs") return { code: "CONTRÔLE", icon: "customs", kind: "customs" };
  if (space.kind === "regional_choice") return { code: "RÉGIONAL", icon: "regional", kind: "regional" };
  if (space.kind === "global_choice") return { code: "GLOBAL", icon: "global", kind: "global" };
  return { code: "ESCALE", icon: "neutral", kind: "neutral" };
}

const tiles = computed(() => props.board.map((space, index) => {
  const position = gridPosition(index);
  if (space.type !== "asset") return { space, index, ...position, special: specialMeta(space), title: null, country: null, resource: null, sector: null };
  const title = ASSETS.find((asset) => asset.id === space.assetId)!;
  const country = COUNTRIES.find((item) => item.id === title.countryId)!;
  const resource = RESOURCES.find((item) => item.id === title.resourceId)!;
  const sector = SECTORS.find((item) => item.id === title.sectorId)!;
  return { space, index, ...position, special: null, title, country, resource, sector };
}));
</script>

<template>
  <div ref="boardRoot" class="world-board world-board--tabletop">
    <svg :viewBox="`0 0 ${viewWidth} ${VIEW_HEIGHT}`" role="img" aria-label="Plateau mondial Orbisium">
      <defs>
        <filter id="board-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy=".6" stdDeviation=".65" flood-color="#172423" flood-opacity=".18" /></filter>
        <filter id="paper"><feTurbulence baseFrequency=".75" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .34 0 0 0 0 .30 0 0 0 .055 0" /></filter>
        <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce8e2" /><stop offset=".55" stop-color="#eef0e7" /><stop offset="1" stop-color="#e8dfc8" /></linearGradient>
      </defs>

      <rect class="board-mat" :width="viewWidth" :height="VIEW_HEIGHT" />
      <rect class="board-ocean" :x="tileWidth" :y="tileHeight" :width="Math.max(0, viewWidth - tileWidth * 2)" :height="VIEW_HEIGHT - tileHeight * 2" rx="1" fill="url(#ocean)" />

      <rect :x="tileWidth" :y="tileHeight" :width="Math.max(0, viewWidth - tileWidth * 2)" :height="VIEW_HEIGHT - tileHeight * 2" filter="url(#paper)" opacity=".55" />

      <g class="board-title" text-anchor="middle">
        <text :x="centerX" y="46.5" class="board-title__name">ORBISIUM</text>
        <text :x="centerX" y="50.7" class="board-title__tagline">LES FLUX DESSINENT LE MONDE</text>
        <line :x1="centerX - 15" y1="53.6" :x2="centerX + 15" y2="53.6" />
        <text :x="centerX" y="57.4" class="board-title__stats">7 CONTINENTS · 28 TERRITOIRES · 24 RESSOURCES</text>
      </g>

      <g class="board-legend" :transform="`translate(${centerX - 18} 83)`">
        <g v-for="(sector, index) in SECTORS" :key="sector.id" :transform="`translate(${index * 9.2} 0)`"><rect width="8.2" height="2.4" rx=".35" :fill="sector.color" /><text x="4.1" y="1.66" text-anchor="middle">{{ compactLabel(sector.shortName, 3) }}</text></g>
      </g>

      <g v-for="tile in tiles" :key="tile.space.id" class="board-tile" :class="{ 'board-tile--occupied': playersAt(tile.index).length, 'board-tile--active': playersAt(tile.index).some(player => player.id === activePlayerId) }" :transform="`translate(${tile.x} ${tile.y})`">
        <title v-if="tile.title">{{ tile.country?.continent }} · {{ tile.country?.name }} · {{ tile.resource?.name }}</title>
        <title v-else>{{ tile.space.name }}</title>
        <template v-if="tile.title && tile.country && tile.resource && tile.sector">
          <rect class="tile-frame" :width="tileWidth" :height="tileHeight" />
          <rect class="tile-country" x=".12" y=".12" :width="Math.max(0, tileWidth - .24)" :height="tileHeight * .42" rx=".12" :fill="continentColors[tile.country.continent]" />
          <rect class="tile-resource" x=".12" :y="tileHeight * .46" :width="Math.max(0, tileWidth - .24)" :height="tileHeight * .5" rx=".12" :fill="tile.sector.color" />
          <text class="tile-country__code" :x="tileWidth / 2" :y="tileHeight * .3" text-anchor="middle">{{ compactLabel(tile.country.name, 6) }}</text>
          <text class="tile-resource__code" :x="tileWidth / 2" :y="tileHeight * .79" text-anchor="middle">{{ compactLabel(tile.resource.name, 6) }}</text>
        </template>
        <template v-else-if="tile.special">
          <rect class="tile-special" :class="`tile-special--${tile.special.kind}`" :width="tileWidth" :height="tileHeight" />
          <foreignObject class="tile-special__icon-host" :x="tileWidth / 2 - .8" :y="tileHeight * .11" width="1.6" height="1.6">
            <div xmlns="http://www.w3.org/1999/xhtml"><GameIcon :name="tile.special.icon" :stroke-width="2.5" /></div>
          </foreignObject>
          <text class="tile-special__code" :x="tileWidth / 2" :y="tileHeight * .8" text-anchor="middle">{{ tile.special.code }}</text>
        </template>

        <g v-for="(player, offset) in playersAt(tile.index)" :key="player.id" class="tile-pawn" :transform="`translate(${pawnPosition(tile.index, offset, playersAt(tile.index).length).x} ${pawnPosition(tile.index, offset, playersAt(tile.index).length).y})`">
          <circle class="pawn-halo" :class="{ active: player.id === activePlayerId }" r="1.72" :fill="player.color" />
          <circle class="pawn" r="1.28" :fill="player.color" />
          <foreignObject class="pawn-symbol-host" x="-.78" y="-.78" width="1.56" height="1.56">
            <div xmlns="http://www.w3.org/1999/xhtml"><PlayerTokenIcon :symbol="player.symbol" :stroke-width="2.6" /></div>
          </foreignObject>
        </g>
      </g>
    </svg>
  </div>
</template>
