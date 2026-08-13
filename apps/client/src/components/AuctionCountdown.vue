<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ deadline: number | null; duration: number }>();
const now = ref(Date.now());
let timer: number | null = null;

const remainingMs = computed(() => Math.max(0, (props.deadline ?? now.value) - now.value));
const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1_000));
const progress = computed(() => Math.min(1, remainingMs.value / Math.max(1, props.duration)));
const urgent = computed(() => remainingMs.value <= 2_000);

onMounted(() => {
  now.value = Date.now();
  timer = window.setInterval(() => { now.value = Date.now(); }, 100);
});
onBeforeUnmount(() => { if (timer !== null) window.clearInterval(timer); });
</script>

<template>
  <div class="auction-countdown" :class="{ urgent }" role="timer" :aria-label="`Clôture dans ${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`">
    <div><span>Clôture dans</span><strong>{{ remainingSeconds }} s</strong></div>
    <span class="auction-countdown__track" aria-hidden="true"><i :style="{ transform: `scaleX(${progress})` }" /></span>
  </div>
</template>
