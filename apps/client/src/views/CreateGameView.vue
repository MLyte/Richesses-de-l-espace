<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { MonitorUp, Smartphone, UsersRound } from "@lucide/vue";
import { useGameStore } from "../stores/game";

const router = useRouter();
const store = useGameStore();
const mobileDevice = computed(() => window.matchMedia("(max-width: 760px), (pointer: coarse)").matches);

function createTvGame(): void {
  void router.push("/display");
}

async function createMobileGame(): Promise<void> {
  const code = await store.createMobileSession();
  if (code) await router.push(`/play/${code}`);
}
</script>

<template>
  <main class="create-game">
    <div class="create-game__intro">
      <p class="eyebrow">Nouvelle expédition</p>
      <h1>Préparez votre<br /><em>expédition.</em></h1>
      <p>Chaque consortium garde ses décisions sur son téléphone. Choisissez où projeter la carte et le journal de bord communs.</p>
    </div>

    <div class="create-game__choices">
      <button type="button" class="mode-card mode-card--tv" :disabled="store.pending" @click="createTvGame">
        <span class="mode-card__icon"><MonitorUp :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ mobileDevice ? 'Avec un autre écran' : 'Recommandé sur cet appareil' }}</span>
        <strong>Pont de commandement</strong>
        <span>La carte stellaire, les trajectoires et les événements sont projetés sur une TV ou un grand écran.</span>
        <b>Activer le pont de commandement</b>
      </button>

      <button type="button" class="mode-card mode-card--mobile" :disabled="store.pending" @click="createMobileGame">
        <span class="mode-card__icon"><Smartphone :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ mobileDevice ? 'Recommandé sur cet appareil' : 'Sans écran partagé' }}</span>
        <strong>Flotte mobile</strong>
        <span>Le créateur devient capitaine de mission : il transmet le code, lance l’expédition et garde les commandes de bord.</span>
        <b>{{ store.pending ? 'Création…' : 'Lancer depuis ce terminal' }}</b>
      </button>
    </div>

    <p class="create-game__note"><UsersRound :size="20" aria-hidden="true" /> 2 à 6 joueurs, sur le même Wi-Fi ou via l’adresse Internet du serveur.</p>
    <div v-if="store.error" class="error-toast" @click="store.error = ''">{{ store.error }}</div>
  </main>
</template>

<style scoped>
.create-game { min-width: 0; min-height: 100dvh; overflow-x: hidden; display: grid; place-content: center; gap: clamp(2rem, 5vh, 4.5rem); padding: clamp(1.25rem, 5vw, 6rem); color: #f3f8fc; background: linear-gradient(145deg, rgba(3, 14, 27, .76), rgba(5, 24, 42, .84)), url("/space-background.jpg") center / cover fixed no-repeat #06111f; }
.create-game__intro { max-width: 820px; }
.create-game__intro h1 { margin: .35rem 0 1rem; font: 800 clamp(2.35rem, 3.8vw, 4.65rem)/1 Manrope, sans-serif; letter-spacing: -.055em; }
.create-game__intro em { color: #f2674a; font-family: Fraunces, Georgia, serif; font-weight: 700; }
.create-game__intro > p:last-child { max-width: 760px; margin: 0; font-size: clamp(1.05rem, 1.5vw, 1.5rem); line-height: 1.5; }
.create-game__choices { width: min(100%, 1140px); min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 560px)); gap: clamp(1rem, 2vw, 2rem); }
.mode-card { min-width: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: 70px minmax(50px, auto) minmax(0, 1fr) auto; gap: .8rem 1.2rem; min-height: 300px; overflow: hidden; padding: clamp(1.5rem, 3vw, 2.5rem); text-align: left; color: inherit; background: linear-gradient(145deg, rgba(21,52,77,.98), rgba(16,42,67,.98)); border: 2px solid rgba(53,208,226,.46); border-radius: 18px; box-shadow: 7px 7px 0 rgba(0,0,0,.24), 0 18px 54px rgba(0,0,0,.22); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.mode-card:hover { transform: translate(-2px,-2px); box-shadow: 10px 10px 0 rgba(0,0,0,.25), 0 22px 58px rgba(0,0,0,.25); }
.mode-card:disabled { opacity: .6; cursor: wait; }
.mode-card__icon { grid-row: 1; display: grid; place-items: center; width: 70px; height: 70px; color: white; background: #2ca6a4; border-radius: 17px; }
.mode-card--mobile .mode-card__icon { background: #f2674a; }
.mode-card__tag { grid-column: 2; grid-row: 1; min-width: 0; align-self: center; color: #9ec2d8; font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.mode-card strong { grid-column: 1 / -1; grid-row: 2; min-width: 0; overflow-wrap: anywhere; align-self: start; font-size: clamp(1.3rem, 1.48vw, 1.65rem); }
.mode-card > span:nth-of-type(3) { grid-column: 1 / -1; grid-row: 3; font-size: clamp(1rem, 1.25vw, 1.2rem); line-height: 1.5; }
.mode-card b { grid-column: 1 / -1; grid-row: 4; align-self: end; padding: 1rem 1.25rem; text-align: center; color: #06111f; background: #35d0e2; border-radius: 12px; }
.mode-card--mobile b { background: #f2674a; }
.create-game__note { display: flex; align-items: center; gap: .65rem; margin: 0; font-size: 1rem; }
@media (max-width: 1100px) and (min-width: 761px) { .create-game { place-content: start center; padding: clamp(2rem, 5vw, 4rem); } .create-game__choices { grid-template-columns: minmax(0, 560px); } }
@media (max-width: 760px) { .create-game { width: 100%; max-width: 100vw; place-content: start stretch; gap: 1.7rem; padding: 1.2rem; } .create-game__intro, .create-game__choices, .create-game__note { width: 100%; max-width: calc(100vw - 2.4rem); min-width: 0; } .create-game__intro h1 { max-width: 100%; overflow-wrap: anywhere; font-size: clamp(2.1rem, 10.5vw, 3rem); } .create-game__choices { grid-template-columns: minmax(0, 1fr); } .mode-card { width: 100%; max-width: calc(100vw - 2.4rem); grid-template-columns: 58px minmax(0, calc(100% - 78px)); min-height: 245px; padding: 1.25rem; } .mode-card > * { min-width: 0; max-width: 100%; } .mode-card > span:nth-of-type(3) { overflow-wrap: anywhere; } .mode-card__icon { width: 58px; height: 58px; } }
</style>
