<script setup lang="ts">
import { Volume2, VolumeX } from "@lucide/vue";
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
    <Volume2 v-if="soundEnabled" :size="19" :stroke-width="2" aria-hidden="true" />
    <VolumeX v-else :size="19" :stroke-width="2" aria-hidden="true" />
  </button>
</template>