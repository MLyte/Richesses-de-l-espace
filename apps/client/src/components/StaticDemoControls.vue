<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { RotateCcw, FlaskConical } from "@lucide/vue";
import { STATIC_DEMO_SCENARIOS, type StaticDemoScenarioId } from "../demo/static-game";
import { useGameStore } from "../stores/game";

const store = useGameStore();
const selectedScenario = computed({
  get: () => store.demoScenario,
  set: (value: StaticDemoScenarioId) => store.setStaticDemoScenario(value)
});
</script>

<template>
  <details class="static-demo-controls">
    <summary><FlaskConical :size="16" aria-hidden="true" /> Démo UX</summary>
    <div class="static-demo-controls__panel">
      <header><strong>Laboratoire statique</strong><small>Aucune synchronisation entre appareils</small></header>
      <label>Situation
        <select v-model="selectedScenario">
          <option v-for="item in STATIC_DEMO_SCENARIOS" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </label>
      <fieldset v-if="store.role !== 'admin'"><legend>Téléphone observé</legend><div>
        <button type="button" :class="{ selected: store.demoPlayerId === 'orion' }" @click="store.switchStaticDemoPlayer('orion')">Orion</button>
        <button type="button" :class="{ selected: store.demoPlayerId === 'lyra' }" @click="store.switchStaticDemoPlayer('lyra')">Lyra</button>
      </div></fieldset>
      <div class="static-demo-controls__actions">
        <button type="button" @click="store.restartStaticDemo"><RotateCcw :size="15" aria-hidden="true" /> Réinitialiser</button>
        <RouterLink to="/">Accueil</RouterLink>
      </div>
    </div>
  </details>
</template>

<style scoped>
.static-demo-controls { position: fixed; z-index: 250; top: .75rem; right: .75rem; color: #eef8fc; font: 700 .75rem/1.3 Manrope, sans-serif; }
.static-demo-controls summary { display: flex; align-items: center; gap: .4rem; width: max-content; margin-left: auto; padding: .55rem .7rem; border: 1px solid rgba(53, 208, 226, .68); border-radius: 999px; background: rgba(8, 29, 48, .94); box-shadow: 0 8px 24px rgba(0, 0, 0, .28); cursor: pointer; list-style: none; }
.static-demo-controls summary::-webkit-details-marker { display: none; }
.static-demo-controls__panel { display: grid; gap: .8rem; width: min(280px, calc(100vw - 1.5rem)); margin-top: .45rem; padding: 1rem; border: 1px solid rgba(53, 208, 226, .55); border-radius: 14px; background: rgba(8, 29, 48, .98); box-shadow: 0 16px 45px rgba(0, 0, 0, .42); }
.static-demo-controls header { display: grid; gap: .15rem; }
.static-demo-controls header strong { font-size: .9rem; }
.static-demo-controls header small { color: #9ec2d8; font-weight: 600; }
.static-demo-controls label, .static-demo-controls fieldset { display: grid; gap: .35rem; margin: 0; padding: 0; border: 0; color: #9ec2d8; }
.static-demo-controls legend { margin-bottom: .35rem; }
.static-demo-controls select, .static-demo-controls button, .static-demo-controls a { min-height: 38px; padding: .48rem .65rem; color: #eef8fc; border: 1px solid rgba(158, 194, 216, .42); border-radius: 9px; background: #102f49; font: inherit; text-decoration: none; }
.static-demo-controls select { width: 100%; }
.static-demo-controls fieldset div, .static-demo-controls__actions { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
.static-demo-controls button { display: flex; align-items: center; justify-content: center; gap: .35rem; cursor: pointer; }
.static-demo-controls button.selected { color: #06111f; border-color: #35d0e2; background: #35d0e2; }
.static-demo-controls__actions a { display: grid; place-items: center; }
@media (max-width: 760px) {
  .static-demo-controls { top: 50%; right: 0; bottom: auto; transform: translateY(-50%); }
  .static-demo-controls:not([open]) summary { padding: .62rem .34rem; border-right: 0; border-radius: 12px 0 0 12px; writing-mode: vertical-rl; }
  .static-demo-controls[open] { top: auto; right: .65rem; bottom: calc(5.4rem + env(safe-area-inset-bottom)); transform: none; }
}
</style>
