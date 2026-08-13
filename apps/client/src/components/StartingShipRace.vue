<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Bot, CheckCircle2, Info, LockKeyhole, Rocket, Trophy } from "@lucide/vue";
import { SPACE_REGIONS, STARTING_RACE_DURATION_MS, STARTING_RACE_SHIPS, type RaceShipId } from "@richesses-espace/game";
import type { PublicGameView } from "@richesses-espace/protocol";

const props = defineProps<{ game: PublicGameView; playerId?: string | null; interactive?: boolean; pending?: boolean }>();
const emit = defineEmits<{ select: [shipId: RaceShipId] }>();

const choiceRegions = STARTING_RACE_SHIPS.map((id) => SPACE_REGIONS.find((region) => region.id === id)!);
const racingRegions = computed(() => props.game.startingRace.finishOrder.map((id) => SPACE_REGIONS.find((region) => region.id === id)!));
const selectedShipId = computed(() => props.playerId ? props.game.startingRace.selections[props.playerId] ?? null : null);
const selectedRegion = computed(() => selectedShipId.value ? SPACE_REGIONS.find((region) => region.id === selectedShipId.value) ?? null : null);
const selectedBy = (shipId: string) => {
  const entry = Object.entries(props.game.startingRace.selections).find(([, id]) => id === shipId);
  return entry ? props.game.players.find((player) => player.id === entry[0]) ?? null : null;
};
const isMine = (shipId: string) => selectedShipId.value === shipId;
const briefingDialog = ref<HTMLDialogElement | null>(null);
const briefingDismissed = ref(false);
const showBriefing = computed(() => props.game.phase === "SHIP_SELECTION" && Boolean(props.interactive) && !selectedShipId.value && !briefingDismissed.value);

watch(showBriefing, async (open) => {
  await nextTick();
  const dialog = briefingDialog.value;
  if (!dialog) return;
  if (open && !dialog.open) dialog.showModal();
  if (!open && dialog.open) dialog.close();
}, { immediate: true });

function dismissBriefing(): void {
  briefingDismissed.value = true;
}
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
    <dialog ref="briefingDialog" class="race-briefing" aria-labelledby="race-briefing-title" aria-describedby="race-briefing-description" @cancel.prevent>
      <div class="race-briefing__icon"><Info :size="27" aria-hidden="true" /></div>
      <p class="eyebrow">Avant que les robots choisissent</p>
      <h2 id="race-briefing-title">Repérez bien votre vaisseau</h2>
      <p id="race-briefing-description">Chaque consortium choisit un vaisseau unique. Votre choix sera mis en lumière pendant toute la course.</p>
      <div class="race-briefing__rules">
        <article><CheckCircle2 :size="21" aria-hidden="true" /><div><strong>Votre choix reste visible</strong><span>La carte et la voie de votre vaisseau porteront le repère « Votre vaisseau ».</span></div></article>
        <article><LockKeyhole :size="21" aria-hidden="true" /><div><strong>Un vaisseau pris est verrouillé</strong><span>Son propriétaire est affiché directement sur la carte.</span></div></article>
        <article><Bot :size="21" aria-hidden="true" /><div><strong>Les robots choisissent après vous</strong><span>Ils attendent que tous les joueurs humains aient confirmé leur choix.</span></div></article>
      </div>
      <button type="button" class="race-briefing__confirm" @click="dismissBriefing">J’ai compris, choisir mon vaisseau</button>
    </dialog>

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
        :style="{ '--ship-color': region.color, '--owner-color': selectedBy(region.id)?.color ?? region.color }"
        :disabled="!interactive || pending || Boolean(selectedShipId) || Boolean(selectedBy(region.id))"
        @click="emit('select', region.id as RaceShipId)"
      >
        <span class="ship-choice__icon"><Rocket :size="26" aria-hidden="true" /></span>
        <span class="ship-choice__copy">
          <strong>{{ region.name }}</strong>
          <small v-if="isMine(region.id)">Votre choix · prêt pour la course</small>
          <small v-else-if="selectedBy(region.id)">Choisi par {{ selectedBy(region.id)?.name }}</small>
          <small v-else>Disponible</small>
        </span>
        <span v-if="isMine(region.id)" class="ship-choice__badge ship-choice__badge--mine"><CheckCircle2 :size="13" aria-hidden="true" />Votre vaisseau</span>
        <span v-else-if="selectedBy(region.id)" class="ship-choice__badge ship-choice__badge--taken"><LockKeyhole :size="12" aria-hidden="true" />Pris</span>
      </button>
    </div>

    <div v-if="game.phase === 'SHIP_RACE' && selectedRegion" class="player-ship-reminder" :style="{ '--ship-color': selectedRegion.color }" role="status">
      <span class="player-ship-reminder__icon"><Rocket :size="22" aria-hidden="true" /></span>
      <span><small>Votre vaisseau dans la course</small><strong>{{ selectedRegion.name }}</strong></span>
      <span class="player-ship-reminder__hint">Suivez la voie lumineuse marquée « Vous »</span>
    </div>

    <div v-if="game.phase === 'SHIP_RACE'" class="race-track" :style="{ '--elapsed': `${elapsedSeconds}s` }">
      <div v-for="(region, index) in racingRegions" :key="region.id" class="race-lane" :class="{ 'race-lane--mine': isMine(region.id) }" :style="laneStyle(region.id as RaceShipId, index)">
        <span class="race-lane__name"><strong>{{ region.name }}</strong><small v-if="isMine(region.id)">Votre vaisseau</small><small v-else>{{ selectedBy(region.id)?.name }}</small></span>
        <span class="race-lane__rail"><i class="racing-ship"><Rocket :size="23" aria-hidden="true" /><b v-if="selectedBy(region.id)" :class="{ 'racing-ship__you': isMine(region.id) }">{{ isMine(region.id) ? 'VOUS' : selectedBy(region.id)?.name }}</b></i><em /></span>
        <span class="race-lane__place">{{ finishPosition(region.id) }}<sup>{{ finishPosition(region.id) === 1 ? 'er' : 'e' }}</sup></span>
      </div>
    </div>

    <footer v-if="game.phase === 'SHIP_SELECTION'" class="race-selection-status">
      <template v-if="selectedRegion"><Rocket :size="20" aria-hidden="true" /><strong>{{ selectedRegion.name }} est votre vaisseau.</strong><span>En attente des autres consortiums…</span></template>
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
.race-briefing { width: min(540px, calc(100vw - 2rem)); padding: clamp(1.2rem, 4vw, 2rem); color: #eff9ff; border: 1px solid rgba(89, 214, 228, .55); border-radius: 22px; background: linear-gradient(145deg, rgba(10, 35, 54, .99), rgba(4, 18, 33, .99)); box-shadow: 0 24px 80px rgba(0, 0, 0, .62), inset 0 1px 0 rgba(255, 255, 255, .08); }
.race-briefing::backdrop { background: rgba(1, 8, 16, .78); backdrop-filter: blur(8px); }
.race-briefing__icon { display: grid; place-items: center; width: 50px; height: 50px; margin-bottom: .9rem; color: #06111f; border-radius: 15px; background: #63dbe9; box-shadow: 0 0 28px rgba(99, 219, 233, .25); }
.race-briefing .eyebrow { margin: 0 0 .35rem; color: #77dce8; }
.race-briefing h2 { margin: 0; font-family: var(--font-display); font-size: clamp(1.6rem, 5vw, 2.25rem); line-height: 1.04; }
.race-briefing > p:not(.eyebrow) { margin: .75rem 0 1.1rem; color: #b7d2e1; line-height: 1.5; }
.race-briefing__rules { display: grid; gap: .55rem; }
.race-briefing__rules article { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: .65rem; padding: .75rem; border: 1px solid rgba(132, 184, 207, .16); border-radius: 13px; background: rgba(5, 18, 31, .62); }
.race-briefing__rules article > svg { margin-top: .08rem; color: #63dbe9; }
.race-briefing__rules strong, .race-briefing__rules span { display: block; }
.race-briefing__rules strong { margin-bottom: .15rem; font-size: .83rem; }
.race-briefing__rules span { color: #9fbccc; font-size: .72rem; line-height: 1.4; }
.race-briefing__confirm { width: 100%; margin-top: 1rem; padding: .85rem 1rem; color: #06111f; border: 0; border-radius: 12px; background: #63dbe9; font: inherit; font-weight: 900; cursor: pointer; }
.race-briefing__confirm:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.starting-race header { max-width: 760px; margin-inline: auto; text-align: center; }
.starting-race h1 { margin: .25rem 0 .45rem; font-family: var(--font-display); font-size: clamp(1.7rem, 4vw, 3.4rem); line-height: .98; }
.starting-race header > p:last-child { margin: 0; color: #a9c9dc; font-size: clamp(.76rem, 1.5vw, 1rem); }
.ship-choice-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; }
.ship-choice { position: relative; display: grid; grid-template-columns: 45px minmax(0, 1fr); align-items: center; gap: .65rem; min-height: 74px; padding: 1.8rem .7rem .7rem; color: #eff9ff; border: 1px solid color-mix(in srgb, var(--ship-color) 64%, #9ab6c8); border-radius: 15px; background: color-mix(in srgb, var(--ship-color) 14%, rgba(8, 27, 45, .94)); text-align: left; cursor: pointer; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.ship-choice:not(:disabled):hover { border-color: color-mix(in srgb, var(--ship-color) 88%, white); box-shadow: 0 8px 24px rgba(0, 0, 0, .2); transform: translateY(-2px); }
.ship-choice:last-child { grid-column: 2 / 4; }
.ship-choice:disabled { cursor: default; opacity: .68; }
.ship-choice.taken { opacity: .88; border-color: color-mix(in srgb, var(--owner-color) 45%, #8297a5); background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .035) 0 8px, transparent 8px 16px), color-mix(in srgb, var(--owner-color) 8%, rgba(5, 17, 29, .97)); filter: saturate(.55); }
.ship-choice.mine { opacity: 1; border-color: var(--ship-color); background: linear-gradient(135deg, color-mix(in srgb, var(--ship-color) 25%, rgba(8, 27, 45, .96)), rgba(5, 19, 32, .98)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ship-color) 42%, transparent), 0 0 30px color-mix(in srgb, var(--ship-color) 30%, transparent); filter: none; }
.ship-choice__icon { display: grid; place-items: center; width: 43px; height: 43px; color: var(--ship-color); border-radius: 50%; background: rgba(2, 13, 24, .65); transform: rotate(45deg); }
.ship-choice__copy, .ship-choice strong, .ship-choice small { display: block; min-width: 0; }
.ship-choice strong { font-size: .8rem; line-height: 1.1; }
.ship-choice small { margin-top: .25rem; color: #9fbdcf; font-size: .68rem; }
.ship-choice.taken small { color: #d4e0e7; }
.ship-choice__badge { position: absolute; top: .48rem; right: .55rem; display: inline-flex; align-items: center; gap: .25rem; padding: .22rem .42rem; border-radius: 999px; font-size: .55rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
.ship-choice__badge--taken { color: #d9e6ed; border: 1px solid rgba(217, 230, 237, .25); background: rgba(3, 13, 23, .72); }
.ship-choice__badge--mine { color: #03111b; background: var(--ship-color); }
.player-ship-reminder { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: .7rem; width: min(680px, 100%); margin-inline: auto; padding: .65rem .85rem; color: #effbff; border: 1px solid color-mix(in srgb, var(--ship-color) 72%, white); border-radius: 14px; background: color-mix(in srgb, var(--ship-color) 20%, rgba(5, 20, 34, .96)); box-shadow: 0 0 28px color-mix(in srgb, var(--ship-color) 22%, transparent); }
.player-ship-reminder__icon { display: grid; place-items: center; width: 36px; height: 36px; color: var(--ship-color); border-radius: 50%; background: rgba(2, 12, 22, .72); transform: rotate(45deg); }
.player-ship-reminder small, .player-ship-reminder strong { display: block; }
.player-ship-reminder small { color: #b8d3df; font-size: .58rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.player-ship-reminder strong { margin-top: .1rem; font-size: .9rem; }
.player-ship-reminder__hint { color: #c9dee7; font-size: .68rem; }
.race-selection-status, .race-live-status { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: .35rem .6rem; min-height: 48px; color: #b9d6e6; text-align: center; }
.race-selection-status strong { color: #fff; }
.race-live-status svg { color: #f6c64d; }
.race-track { display: grid; gap: clamp(.3rem, .8vh, .55rem); }
.race-lane { display: grid; grid-template-columns: minmax(92px, 17%) minmax(0, 1fr) 38px; align-items: center; gap: .65rem; min-height: 48px; padding: .18rem .35rem; border: 1px solid transparent; border-radius: 10px; }
.race-lane--mine { border-color: color-mix(in srgb, var(--ship-color) 60%, transparent); background: color-mix(in srgb, var(--ship-color) 12%, transparent); box-shadow: 0 0 22px color-mix(in srgb, var(--ship-color) 16%, transparent); }
.race-lane__name strong, .race-lane__name small { display: block; }
.race-lane__name strong { color: #c5dae7; font-size: clamp(.62rem, 1.15vw, .82rem); font-weight: 800; line-height: 1.05; }
.race-lane__name small { margin-top: .18rem; overflow: hidden; color: #809cac; font-size: .54rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.race-lane--mine .race-lane__name strong, .race-lane--mine .race-lane__name small { color: #fff; }
.race-lane__rail { position: relative; height: 33px; overflow: hidden; border-right: 3px solid rgba(255, 255, 255, .75); border-radius: 8px 0 0 8px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 6%, rgba(255,255,255,.08) 6% 6.4%), rgba(2, 13, 24, .72); }
.race-lane--mine .race-lane__rail { outline: 2px solid color-mix(in srgb, var(--ship-color) 42%, transparent); outline-offset: 1px; }
.race-lane__rail em { position: absolute; inset: auto 0 3px; height: 1px; background: color-mix(in srgb, var(--ship-color) 55%, transparent); }
.racing-ship { position: absolute; z-index: 1; left: 0; top: 4px; display: flex; align-items: center; gap: .35rem; color: var(--ship-color); filter: drop-shadow(-7px 0 6px color-mix(in srgb, var(--ship-color) 65%, transparent)); animation: ship-race 4.7s linear both; animation-delay: calc(-1 * var(--elapsed)); }
.racing-ship::before { position: absolute; right: calc(100% - 4px); width: 18px; height: 5px; border-radius: 50%; background: linear-gradient(90deg, transparent, var(--ship-color)); content: ""; filter: blur(2px); animation: engine-pulse .18s ease-in-out infinite alternate; }
.racing-ship svg { transform: rotate(45deg); }
.racing-ship b { max-width: 88px; overflow: hidden; color: #fff; font-size: .58rem; text-overflow: ellipsis; white-space: nowrap; }
.racing-ship b.racing-ship__you { padding: .14rem .32rem; color: #06111f; border-radius: 999px; background: var(--ship-color); font-size: .55rem; letter-spacing: .05em; }
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
  .ship-choice { min-height: 68px; padding-top: 1.7rem; }
  .player-ship-reminder { grid-template-columns: 38px minmax(0, 1fr); }
  .player-ship-reminder__hint { display: none; }
  .race-lane { grid-template-columns: 82px minmax(0, 1fr) 30px; gap: .35rem; }
  .race-lane__name strong { font-size: .58rem; }
  .racing-ship b:not(.racing-ship__you) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .racing-ship { left: var(--finish-position); animation: none; }
  .racing-ship::before { animation: none; }
  .race-lane__place { opacity: 1; animation: none; }
}
</style>
