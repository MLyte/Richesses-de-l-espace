<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Download, MonitorUp, RotateCcw, Smartphone, UsersRound } from "@lucide/vue";
import ErrorToast from "../components/ErrorToast.vue";
import { useInstallPrompt } from "../composables/useInstallPrompt";
import { useGameStore } from "../stores/game";

const router = useRouter();
const store = useGameStore();
const localGame = import.meta.env.VITE_LOCAL_GAME === "true";
const mobileDevice = computed(() => window.matchMedia("(max-width: 760px), (pointer: coarse)").matches);
const hasSavedLocalGame = computed(() => localGame && store.hasSavedLocalGame());
const canOpenTv = computed(() => !localGame || hasSavedLocalGame.value);
const { canInstall, showInstallHint, install } = useInstallPrompt();
const buildDate = document.querySelector<HTMLMetaElement>('meta[name="richesses-build-date"]')?.content;
const buildVersion = buildDate?.match(/^\d{4}-\d{2}-\d{2}$/) ? `v${buildDate.replaceAll("-", ".")}` : undefined;

function createTvGame(): void {
  void router.push("/display");
}

async function createMobileGame(startFresh = false): Promise<void> {
  const code = await store.createMobileSession(startFresh);
  if (code) await router.push(startFresh ? { path: `/play/${code}`, query: { new: "1" } } : { path: `/play/${code}` });
}
</script>

<template>
  <main class="create-game">
    <div class="create-game__intro">
      <p class="eyebrow">{{ localGame ? 'Expédition solo' : 'Nouvelle expédition' }}</p>
      <h1>{{ localGame ? 'Affrontez' : 'Préparez votre' }}<br /><em>{{ localGame ? 'les robots.' : 'expédition.' }}</em></h1>
      <p v-if="localGame">Jouez une partie complète contre 1 à 5 robots Équilibrés. La partie est sauvegardée automatiquement dans ce navigateur.</p>
      <p v-else>Chaque consortium garde ses décisions sur son téléphone. Choisissez où projeter la carte et le journal de bord communs.</p>
    </div>

    <div class="create-game__choices">
      <button type="button" class="mode-card mode-card--tv" :disabled="store.pending || !canOpenTv" @click="createTvGame">
        <span class="mode-card__icon"><MonitorUp :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ localGame ? 'Vue grand écran' : mobileDevice ? 'Avec un autre écran' : 'Recommandé sur cet appareil' }}</span>
        <strong>{{ localGame ? 'Pont d’observation' : 'Pont de commandement' }}</strong>
        <span>{{ localGame ? 'Observez sur grand écran la partie solo sauvegardée dans ce navigateur. Commencez par créer votre joueur.' : 'La carte stellaire, les trajectoires et les événements sont projetés sur une TV ou un grand écran.' }}</span>
        <small class="mode-card__mobile-note">Optionnel · recommandé sur grand écran.</small>
        <b>{{ localGame ? canOpenTv ? 'Afficher la partie' : 'Disponible après votre embarquement' : 'Activer le pont de commandement' }}</b>
      </button>

      <button type="button" class="mode-card mode-card--mobile" :disabled="store.pending" @click="createMobileGame(localGame && !hasSavedLocalGame)">
        <span class="mode-card__icon"><Smartphone :size="42" aria-hidden="true" /></span>
        <span class="mode-card__tag">{{ localGame ? 'Joueur contre ordinateur' : mobileDevice ? 'Recommandé sur cet appareil' : 'Sans écran partagé' }}</span>
        <strong>{{ localGame ? 'Partie contre les robots' : 'Flotte mobile' }}</strong>
        <span>{{ localGame ? 'Choisissez votre identité et de 1 à 5 adversaires, puis développez vos concessions face aux robots.' : 'Chaque téléphone affiche les actions, la carte et les positions. Le créateur partage le code et garde les commandes de bord.' }}</span>
        <b>{{ store.pending ? 'Chargement…' : localGame ? hasSavedLocalGame ? 'Reprendre la partie' : 'Choisir les robots' : 'Lancer depuis ce terminal' }}</b>
      </button>
    </div>

    <button v-if="hasSavedLocalGame" type="button" class="new-local-game" :disabled="store.pending" @click="createMobileGame(true)"><RotateCcw :size="18" aria-hidden="true" />Nouvelle expédition · choisir les robots</button>

    <p class="create-game__note"><UsersRound :size="20" aria-hidden="true" /> {{ localGame ? 'Votre consortium affronte jusqu’à cinq robots aux identités aléatoires, qui jouent automatiquement, sans tricher et sans serveur.' : '2 à 6 joueurs, sur le même Wi-Fi ou via l’adresse Internet du serveur.' }}</p>
    <aside v-if="showInstallHint" class="install-mode" aria-label="Mode plein écran">
      <Download :size="20" aria-hidden="true" />
      <div><strong>Mode plein écran</strong><span>{{ canInstall ? 'Installez le jeu pour masquer les barres du navigateur.' : 'Ajoutez cette page à l’écran d’accueil depuis le menu de votre navigateur.' }}</span></div>
      <button v-if="canInstall" type="button" @click="install">Installer</button>
    </aside>
    <p v-if="buildVersion" class="create-game__version" aria-label="Version du jeu">Version {{ buildVersion }}</p>
    <ErrorToast v-if="store.error" :message="store.error" @dismiss="store.error = ''" />
  </main>
</template>

<style scoped>
.create-game { min-width: 0; min-height: var(--app-viewport-height); overflow-x: hidden; display: grid; place-content: center; gap: clamp(2rem, 5vh, 4.5rem); padding: clamp(1.25rem, 5vw, 6rem); color: #f3f8fc; background: linear-gradient(145deg, rgba(3, 14, 27, .76), rgba(5, 24, 42, .84)), url("/space-background.jpg") center / cover fixed no-repeat #06111f; }
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
.mode-card__mobile-note { display: none; }
.create-game__note { display: flex; align-items: center; gap: .65rem; margin: 0; font-size: 1rem; }
.new-local-game { display: flex; align-items: center; justify-content: center; gap: .5rem; min-height: 46px; margin: -1.25rem auto 0; padding: .7rem 1rem; color: #f3f8fc; border: 1px solid rgba(114, 169, 194, .55); border-radius: 10px; background: rgba(16, 42, 67, .86); font: 800 .75rem Manrope; }
.install-mode { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .75rem; width: min(100%, 720px); padding: .8rem 1rem; color: #d9edf5; border: 1px solid rgba(114, 169, 194, .45); border-radius: 12px; background: rgba(11, 36, 58, .92); }
.install-mode div, .install-mode strong, .install-mode span { display: block; min-width: 0; }
.install-mode strong { color: #fff; font-size: .85rem; }
.install-mode span { margin-top: .12rem; color: #b9d8e5; font-size: .75rem; line-height: 1.35; }
.install-mode button { min-height: 44px; padding: 0 .85rem; color: #06111f; border: 0; border-radius: 9px; background: #35d0e2; font: inherit; font-size: .78rem; font-weight: 800; }
.create-game__version { margin: -1rem 0 0; color: #9ec2d8; font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
@media (max-width: 1100px) and (min-width: 761px) { .create-game { place-content: start center; padding: clamp(2rem, 5vw, 4rem); } .create-game__choices { grid-template-columns: minmax(0, 560px); } }
@media (max-width: 760px) {
  .create-game { width: 100%; max-width: 100vw; place-content: start stretch; gap: 1.7rem; padding: 1.2rem; }
  .create-game__intro, .create-game__choices, .create-game__note, .install-mode, .create-game__version { width: 100%; max-width: calc(100vw - 2.4rem); min-width: 0; }
  .create-game__intro h1 { max-width: 100%; overflow-wrap: anywhere; font-size: clamp(2.1rem, 10.5vw, 3rem); }
  .create-game__choices { grid-template-columns: minmax(0, 1fr); gap: .8rem; }
  .mode-card { width: 100%; max-width: calc(100vw - 2.4rem); grid-template-columns: 58px minmax(0, calc(100% - 78px)); min-height: 245px; padding: 1.25rem; }
  .mode-card > * { min-width: 0; max-width: 100%; }
  .mode-card > span:nth-of-type(3) { overflow-wrap: anywhere; }
  .mode-card__icon { width: 58px; height: 58px; }
  .mode-card--mobile { order: -1; }
  .mode-card--tv {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    min-height: 0;
    padding: .85rem .95rem;
    gap: .15rem .7rem;
  }
  .mode-card--tv .mode-card__icon { grid-column: 1; grid-row: 1 / span 2; width: 42px; height: 42px; border-radius: 12px; }
  .mode-card--tv .mode-card__tag { grid-column: 2; grid-row: 1; align-self: end; font-size: .75rem; }
  .mode-card--tv strong { grid-column: 2; grid-row: 2; align-self: start; font-size: 1rem; }
  .mode-card--tv > span:nth-of-type(3) { display: none; }
  .mode-card--tv .mode-card__mobile-note { display: block; grid-column: 2 / -1; grid-row: 3; color: #c9e8f4; font-size: .75rem; line-height: 1.4; }
  .mode-card--tv b { grid-column: 1 / -1; grid-row: 4; min-height: 44px; display: grid; place-items: center; padding: .65rem .75rem; color: #c9e8f4; border: 1px solid #72a9c2; border-radius: 10px; background: #0b243a; font-size: .8rem; }
  .install-mode { grid-template-columns: auto minmax(0, 1fr); }
  .install-mode button { grid-column: 1 / -1; width: 100%; }
}
</style>
