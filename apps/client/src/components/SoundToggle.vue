<script setup lang="ts">
import { soundEnabled, toggleSound } from "../services/audio";
import { useGameStore } from "../stores/game";

const store = useGameStore();
function toggle(): void {
  toggleSound();
  store.syncActionReminder();
}
</script>
<template>
  <button class="sound-toggle" :aria-label="soundEnabled ? 'Couper les sons' : 'Activer les sons'" :title="soundEnabled ? 'Couper les sons' : 'Activer les sons'" @click="toggle">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l4 4V6l-4 4H4Z" /><path v-if="soundEnabled" d="M15 9c1.4 1.7 1.4 4.3 0 6m3-9c3 3.3 3 8.7 0 12" /><path v-else d="m15 9 6 6m0-6-6 6" /></svg>
  </button>
</template>
