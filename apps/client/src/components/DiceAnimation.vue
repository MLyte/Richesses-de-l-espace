<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import DieFace from "./DieFace.vue";

const props = defineProps<{ dice: [number, number]; total: number; rolling: boolean; compact?: boolean }>();
const faces = ref<[number, number]>([1, 1]);
let timer: number | null = null;

function stopTimer() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

watch(() => props.rolling, (rolling) => {
  stopTimer();
  if (!rolling) {
    faces.value = [...props.dice];
    return;
  }
  faces.value = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
  timer = window.setInterval(() => {
    faces.value = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
  }, 78);
}, { immediate: true });

watch(() => props.dice, (dice) => { if (!props.rolling) faces.value = [...dice]; });
onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="dice-cast" :class="{ rolling, compact }" role="status" :aria-label="rolling ? 'Les dés roulent' : `Résultat des dés : ${dice[0]} et ${dice[1]}, total ${total}`">
    <p>{{ rolling ? 'Les dés roulent…' : 'Résultat du lancer' }}</p>
    <div class="dice-cast__faces" aria-hidden="true">
      <DieFace :value="faces[0]" coral />
      <DieFace :value="faces[1]" />
    </div>
    <strong v-if="!rolling"><small>Total</small>{{ total }}</strong>
  </div>
</template>
