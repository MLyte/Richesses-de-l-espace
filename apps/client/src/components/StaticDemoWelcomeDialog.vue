<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { Bot, Gamepad2, Save } from "@lucide/vue";

const SESSION_KEY = "richesses-espace:solo-welcome-seen";
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
    <div class="static-welcome__icon"><Bot :size="28" aria-hidden="true" /></div>
    <p class="eyebrow">Partie solo · joueur contre ordinateur</p>
    <h1 id="static-welcome-title">Bienvenue à bord de<br /><em>Richesses de l’espace.</em></h1>
    <p id="static-welcome-description" class="static-welcome__intro">Vous incarnez Lyra dans une partie complète contre Orion, un robot Équilibré qui joue avec les mêmes informations et les mêmes règles que vous.</p>

    <div class="static-welcome__facts">
      <article><Gamepad2 :size="21" aria-hidden="true" /><div><strong>Une vraie partie, du premier lancer à la victoire</strong><p>Lancez les dés, achetez des concessions, payez les droits et négociez avec Orion.</p></div></article>
      <article><Bot :size="21" aria-hidden="true" /><div><strong>Orion joue automatiquement</strong><p>Le robot réfléchit après vos actions, respecte une réserve de capital et ne connaît pas vos informations privées.</p></div></article>
      <article><Save :size="21" aria-hidden="true" /><div><strong>Progression sauvegardée</strong><p>La partie reste sur cet appareil et reprend automatiquement là où vous l’avez laissée.</p></div></article>
    </div>

    <button type="button" class="static-welcome__close" @click="close">Jouer contre Orion</button>
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
.static-welcome__facts strong { font-size: .925rem; }
.static-welcome__facts p { margin-top: .22rem; color: #c9e8f4; font-size: .875rem; line-height: 1.45; }
.static-welcome__close { display: grid; grid-template-columns: 1fr 38px; align-items: center; width: 100%; min-height: 56px; margin-top: 1rem; padding: .5rem .55rem .5rem 1rem; color: #06111f; border: 0; border-radius: 12px; background: #35d0e2; font: 800 .88rem Manrope, sans-serif; }
.static-welcome__close b { display: grid; place-items: center; width: 38px; height: 38px; color: #eef8fc; border-radius: 50%; background: #0b2840; font: 700 .95rem "IBM Plex Mono", monospace; }
.static-welcome > small { display: block; margin-top: .65rem; color: #c9e8f4; font-size: .8125rem; text-align: center; }
@media (max-width: 520px) {
  .static-welcome { width: calc(100vw - 1rem); max-height: calc(100dvh - 1rem); padding: 1.15rem; border-radius: 17px; }
  .static-welcome__icon { width: 44px; height: 44px; margin-bottom: .8rem; }
  .static-welcome__intro { margin: .75rem 0 1rem; font-size: .85rem; }
  .static-welcome__facts article { padding: .68rem; }
}
</style>
