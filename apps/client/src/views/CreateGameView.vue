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
      <h1>Comment voulez-vous<br /><em>installer la table ?</em></h1>
      <p>Dans les deux modes, chaque joueur garde ses décisions sur son téléphone. Choisissez simplement où afficher l’état commun.</p>
    </div>

    <div class="create-game__choices">
      <button type="button" class="mode-card mode-card--tv" :disabled="store.pending" @click="createTvGame">
        <span class="mode-card__icon"><MonitorUp :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ mobileDevice ? 'Avec un autre écran' : 'Recommandé sur cet appareil' }}</span>
        <strong>Écran commun</strong>
        <span>La carte, les déplacements et les événements restent visibles sur une TV ou un grand écran.</span>
        <b>Créer l’écran de table</b>
      </button>

      <button type="button" class="mode-card mode-card--mobile" :disabled="store.pending" @click="createMobileGame">
        <span class="mode-card__icon"><Smartphone :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ mobileDevice ? 'Recommandé sur cet appareil' : 'Sans écran partagé' }}</span>
        <strong>Téléphones uniquement</strong>
        <span>Le créateur devient l’hôte. Il partage le code, lance la partie et garde les commandes d’administration.</span>
        <b>{{ store.pending ? 'Création…' : 'Créer sur ce téléphone' }}</b>
      </button>
    </div>

    <p class="create-game__note"><UsersRound :size="20" aria-hidden="true" /> 2 à 6 joueurs, sur le même Wi-Fi ou via l’adresse Internet du serveur.</p>
    <div v-if="store.error" class="error-toast" @click="store.error = ''">{{ store.error }}</div>
  </main>
</template>

<style scoped>
.create-game { min-height: 100dvh; display: grid; place-content: center; gap: clamp(2rem, 5vh, 4.5rem); padding: clamp(1.25rem, 5vw, 6rem); color: #18324a; background: radial-gradient(circle at 80% 10%, rgba(44,166,164,.16), transparent 30%), radial-gradient(circle at 10% 90%, rgba(242,103,74,.14), transparent 32%), #f7f9f6; }
.create-game__intro { max-width: 980px; }
.create-game__intro h1 { margin: .35rem 0 1rem; font: 800 clamp(2.7rem, 6vw, 6.4rem)/.92 Manrope, sans-serif; letter-spacing: -.055em; }
.create-game__intro em { color: #f2674a; font-family: Fraunces, Georgia, serif; font-weight: 700; }
.create-game__intro > p:last-child { max-width: 760px; margin: 0; font-size: clamp(1.05rem, 1.5vw, 1.5rem); line-height: 1.5; }
.create-game__choices { display: grid; grid-template-columns: repeat(2, minmax(0, 560px)); gap: clamp(1rem, 2vw, 2rem); }
.mode-card { display: grid; grid-template-columns: auto 1fr; gap: .8rem 1.2rem; min-height: 300px; padding: clamp(1.5rem, 3vw, 2.5rem); text-align: left; color: inherit; background: #fff; border: 2px solid #18324a; border-radius: 18px; box-shadow: 7px 7px 0 rgba(24,50,74,.13); cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.mode-card:hover { transform: translate(-2px,-2px); box-shadow: 10px 10px 0 rgba(24,50,74,.14); }
.mode-card:disabled { opacity: .6; cursor: wait; }
.mode-card__icon { grid-row: 1 / span 2; display: grid; place-items: center; width: 70px; height: 70px; color: white; background: #2ca6a4; border-radius: 17px; }
.mode-card--mobile .mode-card__icon { background: #f2674a; }
.mode-card__tag { align-self: end; color: #52687a; font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.mode-card strong { align-self: start; font-size: clamp(1.65rem, 2vw, 2.25rem); }
.mode-card > span:nth-of-type(3) { grid-column: 1 / -1; font-size: clamp(1rem, 1.25vw, 1.2rem); line-height: 1.5; }
.mode-card b { grid-column: 1 / -1; align-self: end; padding: 1rem 1.25rem; text-align: center; color: white; background: #18324a; border-radius: 12px; }
.mode-card--mobile b { background: #f2674a; }
.create-game__note { display: flex; align-items: center; gap: .65rem; margin: 0; font-size: 1rem; }
@media (max-width: 760px) { .create-game { place-content: start; gap: 1.7rem; padding: 1.2rem; } .create-game__intro h1 { font-size: clamp(2.6rem, 13vw, 4rem); } .create-game__choices { grid-template-columns: 1fr; } .mode-card { min-height: 245px; padding: 1.25rem; } .mode-card__icon { width: 58px; height: 58px; } }
</style>
