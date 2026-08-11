<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { FlaskConical, MousePointerClick, WifiOff } from "@lucide/vue";

const SESSION_KEY = "richesses-espace:static-demo-welcome-seen";
const dialog = ref<HTMLDialogElement | null>(null);

function wasSeen(): boolean {
  try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; }
  catch { return false; }
}

function remember(): void {
  try { window.sessionStorage.setItem(SESSION_KEY, "1"); }
  catch { /* Le stockage peut être bloqué en navigation privée stricte. */ }
}

function close(): void {
  remember();
  if (typeof dialog.value?.close === "function") dialog.value.close();
  else dialog.value?.removeAttribute("open");
}

onMounted(async () => {
  if (wasSeen()) return;
  await nextTick();
  if (typeof dialog.value?.showModal === "function") dialog.value.showModal();
  else dialog.value?.setAttribute("open", "");
});
</script>

<template>
  <dialog ref="dialog" class="static-welcome" aria-labelledby="static-welcome-title" aria-describedby="static-welcome-description" @cancel.prevent>
    <div class="static-welcome__icon"><FlaskConical :size="28" aria-hidden="true" /></div>
    <p class="eyebrow">Bêta publique · laboratoire UX</p>
    <h1 id="static-welcome-title">Bienvenue dans la démo de<br /><em>Richesses de l’espace.</em></h1>
    <p id="static-welcome-description" class="static-welcome__intro">Cette version sert à tester la compréhension, la lisibilité et le confort des interfaces avant l’ouverture du véritable jeu multijoueur.</p>

    <div class="static-welcome__facts">
      <article><MousePointerClick :size="21" aria-hidden="true" /><div><strong>Une partie simulée, mais interactive</strong><p>Orion et Lyra utilisent les vraies données et les vraies règles. Lancez les dés, achetez et explorez librement.</p></div></article>
      <article><WifiOff :size="21" aria-hidden="true" /><div><strong>Aucun appareil n’est synchronisé</strong><p>Tout se déroule localement dans votre navigateur. Le QR code et le multijoueur en temps réel ne sont pas encore actifs.</p></div></article>
      <article><FlaskConical :size="21" aria-hidden="true" /><div><strong>Plusieurs situations sont disponibles</strong><p>Ouvrez la languette « Démo UX » pour tester un achat, un paiement, une enchère, un échange, une pause ou une fin de partie.</p></div></article>
    </div>

    <button type="button" class="static-welcome__close" @click="close">Accéder à la démo</button>
    <small>Ce message ne sera affiché qu’une fois pendant cette session.</small>
  </dialog>
</template>

<style scoped>
.static-welcome { width: min(680px, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: clamp(1.4rem, 4vw, 2.5rem); color: #eef8fc; border: 1px solid rgba(53, 208, 226, .62); border-radius: 22px; background: linear-gradient(145deg, rgba(8, 29, 48, .99), rgba(11, 40, 64, .99)); box-shadow: 0 28px 90px rgba(0, 0, 0, .62); }
.static-welcome::backdrop { background: rgba(2, 9, 17, .82); backdrop-filter: blur(8px); }
.static-welcome__icon { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 1.2rem; color: #06111f; border-radius: 15px; background: #35d0e2; box-shadow: 5px 5px 0 rgba(0, 0, 0, .2); }
.static-welcome .eyebrow { margin-bottom: .65rem; color: #6fddea; }
.static-welcome h1 { font-size: clamp(1.85rem, 5vw, 3rem); line-height: 1.04; }
.static-welcome h1 em { color: #f2674a; }
.static-welcome__intro { margin: 1rem 0 1.35rem; color: #c4dbe6; font-size: .98rem; line-height: 1.55; }
.static-welcome__facts { display: grid; gap: .65rem; }
.static-welcome__facts article { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: .7rem; padding: .85rem; border: 1px solid rgba(114, 169, 194, .26); border-radius: 12px; background: rgba(7, 28, 48, .72); }
.static-welcome__facts article > svg { margin-top: .05rem; color: #35d0e2; }
.static-welcome__facts strong, .static-welcome__facts p { display: block; margin: 0; }
.static-welcome__facts strong { font-size: .84rem; }
.static-welcome__facts p { margin-top: .22rem; color: #9fc3d3; font-size: .75rem; line-height: 1.45; }
.static-welcome__close { display: grid; grid-template-columns: 1fr 38px; align-items: center; width: 100%; min-height: 56px; margin-top: 1rem; padding: .5rem .55rem .5rem 1rem; color: #06111f; border: 0; border-radius: 12px; background: #35d0e2; font: 800 .88rem Manrope, sans-serif; }
.static-welcome__close b { display: grid; place-items: center; width: 38px; height: 38px; color: #eef8fc; border-radius: 50%; background: #0b2840; font: 700 .95rem "IBM Plex Mono", monospace; }
.static-welcome > small { display: block; margin-top: .65rem; color: #789caf; font-size: .68rem; text-align: center; }
@media (max-width: 520px) {
  .static-welcome { width: calc(100vw - 1rem); max-height: calc(100dvh - 1rem); padding: 1.15rem; border-radius: 17px; }
  .static-welcome__icon { width: 44px; height: 44px; margin-bottom: .8rem; }
  .static-welcome__intro { margin: .75rem 0 1rem; font-size: .85rem; }
  .static-welcome__facts article { padding: .68rem; }
}
</style>
