<script setup lang="ts">
import { computed } from "vue";
import { Rocket, Trophy } from "@lucide/vue";
import { SPACE_REGIONS, STARTING_RACE_DURATION_MS, STARTING_RACE_SHIPS, type RaceShipId } from "@richesses-espace/game";
import type { PublicGameView } from "@richesses-espace/protocol";

const props = defineProps<{ game: PublicGameView; playerId?: string | null; interactive?: boolean; pending?: boolean }>();
const emit = defineEmits<{ select: [shipId: RaceShipId] }>();

const choiceRegions = STARTING_RACE_SHIPS.map((id) => SPACE_REGIONS.find((region) => region.id === id)!);
const racingRegions = computed(() => props.game.startingRace.finishOrder.map((id) => SPACE_REGIONS.find((region) => region.id === id)!));
const selectedShipId = computed(() => props.playerId ? props.game.startingRace.selections[props.playerId] ?? null : null);
const selectedBy = (shipId: string) => {
  const entry = Object.entries(props.game.startingRace.selections).find(([, id]) => id === shipId);
  return entry ? props.game.players.find((player) => player.id === entry[0]) ?? null : null;
};
const finishPosition = (shipId: string) => props.game.startingRace.finishOrder.indexOf(shipId as RaceShipId) + 1;
const finishPercent = (shipId: string) => 94 - Math.max(0, finishPosition(shipId) - 1) * 3.6;
const elapsedSeconds = computed(() => {
  const deadline = props.game.startingRace.raceEndsAt;
  return deadline ? Math.max(0, Math.min(4.75, (Date.now() - (deadline - STARTING_RACE_DURATION_MS)) / 1_000)) : 0;
});
const laneStyle = (shipId: RaceShipId, index: number) => ({
  "--ship-color": SPACE_REGIONS.find((region) => region.id === shipId)!.color,
  "--checkpoint-1": `${14 + (index * 7) % 9}%`,
  "--checkpoint-2": `${34 + (index * 11) % 16}%`,
  "--checkpoint-3": `${53 + (index * 13) % 18}%`,
  "--checkpoint-4": `${73 + (index * 5) % 11}%`,
  "--finish-position": `calc(${finishPercent(shipId)}% - 30px)`
});
</script>

<template>
  <section class="starting-race" :class="{ 'starting-race--selection': game.phase === 'SHIP_SELECTION', 'starting-race--running': game.phase === 'SHIP_RACE' }" aria-live="polite">
    <header>
      <p class="eyebrow">{{ game.phase === 'SHIP_SELECTION' ? 'Sept vaisseaux régionaux disponibles' : `Course d’ouverture · ${racingRegions.length} vaisseaux` }}</p>
      <h1 v-if="game.phase === 'SHIP_SELECTION'">Choisissez votre vaisseau</h1>
      <h1 v-else>Propulseurs allumés !</h1>
      <p v-if="game.phase === 'SHIP_SELECTION'">Chaque consortium choisit un vaisseau différent. Seuls les vaisseaux choisis prendront le départ.</p>
      <p v-else>Le premier vaisseau à franchir la balise désignera le consortium qui ouvre la trajectoire.</p>
    </header>

    <div v-if="game.phase === 'SHIP_SELECTION'" class="ship-choice-grid">
      <button
        v-for="region in choiceRegions"
        :key="region.id"
        type="button"
        class="ship-choice"
        :class="{ taken: selectedBy(region.id), mine: selectedShipId === region.id }"
        :style="{ '--ship-color': region.color }"
        :disabled="!interactive || pending || Boolean(selectedShipId) || Boolean(selectedBy(region.id))"
        @click="emit('select', region.id as RaceShipId)"
      >
        <span class="ship-choice__icon"><Rocket :size="26" aria-hidden="true" /></span>
        <span><strong>{{ region.name }}</strong><small>{{ selectedBy(region.id)?.name ?? 'Disponible' }}</small></span>
      </button>
    </div>

    <div v-else class="race-track" :style="{ '--elapsed': `${elapsedSeconds}s` }">
      <div v-for="(region, index) in racingRegions" :key="region.id" class="race-lane" :style="laneStyle(region.id as RaceShipId, index)">
        <span class="race-lane__name">{{ region.name }}</span>
        <span class="race-lane__rail"><i class="racing-ship"><Rocket :size="23" aria-hidden="true" /><b v-if="selectedBy(region.id)">{{ selectedBy(region.id)?.name }}</b></i><em /></span>
        <span class="race-lane__place">{{ finishPosition(region.id) }}<sup>{{ finishPosition(region.id) === 1 ? 'er' : 'e' }}</sup></span>
      </div>
    </div>

    <footer v-if="game.phase === 'SHIP_SELECTION'" class="race-selection-status">
      <template v-if="selectedShipId"><Rocket :size="20" aria-hidden="true" /><strong>Vaisseau verrouillé.</strong><span>En attente des autres consortiums…</span></template>
      <template v-else-if="interactive"><strong>À vous de choisir.</strong><span>Un vaisseau ne peut être attribué qu’une fois.</span></template>
      <template v-else><strong>{{ Object.keys(game.startingRace.selections).length }}/{{ game.players.length }} choix confirmés</strong><span>La course commencera automatiquement.</span></template>
    </footer>
    <footer v-else class="race-live-status">
      <Trophy :size="22" aria-hidden="true" /><span>Verdict à la balise…</span>
    </footer>
  </section>
</template>

<style scoped>
.starting-race { display: grid; align-content: center; gap: clamp(.8rem, 2vh, 1.4rem); width: min(1080px, 100%); min-height: 100%; margin: auto; padding: clamp(1rem, 3vw, 2.4rem); color: #eff9ff; }
.starting-race header { max-width: 760px; margin-inline: auto; text-align: center; }
.starting-race h1 { margin: .25rem 0 .45rem; font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 3.4rem); line-height: .98; }
.starting-race header > p:last-child { margin: 0; color: #a9c9dc; font-size: clamp(.76rem, 1.5vw, 1rem); }
.ship-choice-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; }
.ship-choice { display: grid; grid-template-columns: 45px minmax(0, 1fr); align-items: center; gap: .65rem; min-height: 74px; padding: .7rem; color: #eff9ff; border: 1px solid color-mix(in srgb, var(--ship-color) 64%, #9ab6c8); border-radius: 15px; background: color-mix(in srgb, var(--ship-color) 14%, rgba(8, 27, 45, .94)); text-align: left; cursor: pointer; }
.ship-choice:last-child { grid-column: 2 / 4; }
.ship-choice:disabled { cursor: default; opacity: .62; }
.ship-choice.taken { border-color: rgba(161, 185, 201, .35); filter: saturate(.65); }
.ship-choice.mine { opacity: 1; border-color: var(--ship-color); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ship-color) 35%, transparent), 0 0 24px color-mix(in srgb, var(--ship-color) 22%, transparent); filter: none; }
.ship-choice__icon { display: grid; place-items: center; width: 43px; height: 43px; color: var(--ship-color); border-radius: 50%; background: rgba(2, 13, 24, .65); transform: rotate(45deg); }
.ship-choice span:last-child, .ship-choice strong, .ship-choice small { display: block; min-width: 0; }
.ship-choice strong { font-size: .8rem; line-height: 1.1; }
.ship-choice small { margin-top: .25rem; color: #9fbdcf; font-size: .68rem; }
.race-selection-status, .race-live-status { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: .35rem .6rem; min-height: 48px; color: #b9d6e6; text-align: center; }
.race-selection-status strong { color: #fff; }
.race-live-status svg { color: #f6c64d; }
.race-track { display: grid; gap: clamp(.3rem, .8vh, .55rem); }
.race-lane { display: grid; grid-template-columns: minmax(92px, 17%) minmax(0, 1fr) 38px; align-items: center; gap: .65rem; min-height: 48px; }
.race-lane__name { color: #c5dae7; font-size: clamp(.62rem, 1.15vw, .82rem); font-weight: 800; line-height: 1.05; }
.race-lane__rail { position: relative; height: 33px; overflow: hidden; border-right: 3px solid rgba(255, 255, 255, .75); border-radius: 8px 0 0 8px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 6%, rgba(255,255,255,.08) 6% 6.4%), rgba(2, 13, 24, .72); }
.race-lane__rail em { position: absolute; inset: auto 0 3px; height: 1px; background: color-mix(in srgb, var(--ship-color) 55%, transparent); }
.racing-ship { position: absolute; z-index: 1; left: 0; top: 4px; display: flex; align-items: center; gap: .35rem; color: var(--ship-color); filter: drop-shadow(-7px 0 6px color-mix(in srgb, var(--ship-color) 65%, transparent)); animation: ship-race 4.7s linear both; animation-delay: calc(-1 * var(--elapsed)); }
.racing-ship::before { position: absolute; right: calc(100% - 4px); width: 18px; height: 5px; border-radius: 50%; background: linear-gradient(90deg, transparent, var(--ship-color)); content: ""; filter: blur(2px); animation: engine-pulse .18s ease-in-out infinite alternate; }
.racing-ship svg { transform: rotate(45deg); }
.racing-ship b { max-width: 88px; overflow: hidden; color: #fff; font-size: .58rem; text-overflow: ellipsis; white-space: nowrap; }
.race-lane__place { opacity: 0; color: var(--ship-color); font-family: var(--font-display); font-weight: 900; animation: reveal-place .25s 4.5s forwards; animation-delay: calc(4.5s - var(--elapsed)); }
.race-lane__place sup { font-size: .5em; }
@keyframes ship-race {
  0%, 8% { left: 0; transform: translateX(0); animation-timing-function: cubic-bezier(.3,.05,.7,.95); }
  10% { left: 1%; transform: translateX(2px); animation-timing-function: cubic-bezier(.18,.7,.25,1); }
  22% { left: var(--checkpoint-1); transform: translateX(0); animation-timing-function: cubic-bezier(.45,.05,.35,1); }
  45% { left: var(--checkpoint-2); animation-timing-function: cubic-bezier(.18,.75,.35,1); }
  64% { left: var(--checkpoint-3); animation-timing-function: cubic-bezier(.5,.05,.3,1); }
  82% { left: var(--checkpoint-4); animation-timing-function: cubic-bezier(.18,.75,.25,1); }
  100% { left: var(--finish-position); transform: translateX(0); }
}
@keyframes engine-pulse { from { opacity: .4; transform: scaleX(.65); } to { opacity: 1; transform: scaleX(1.15); } }
@keyframes reveal-place { to { opacity: 1; } }
@media (max-width: 700px) {
  .starting-race { align-content: start; min-height: auto; padding: 1rem .85rem 1.5rem; }
  .ship-choice-grid { grid-template-columns: 1fr; gap: .5rem; }
  .ship-choice:last-child { grid-column: auto; }
  .ship-choice { min-height: 62px; }
  .race-lane { grid-template-columns: 82px minmax(0, 1fr) 30px; gap: .35rem; }
  .race-lane__name { font-size: .58rem; }
  .racing-ship b { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .racing-ship { left: var(--finish-position); animation: none; }
  .racing-ship::before { animation: none; }
  .race-lane__place { opacity: 1; animation: none; }
}
</style>
