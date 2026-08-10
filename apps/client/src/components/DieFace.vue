<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ value: number; coral?: boolean }>(), { coral: false });
const visiblePips = computed(() => {
  const pips: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  return new Set(pips[props.value] ?? pips[1]);
});
</script>

<template>
  <span class="die-face" :class="{ 'die-face--coral': coral }" :aria-label="`Dé ${value}`">
    <i v-for="index in 9" :key="index" :class="{ visible: visiblePips.has(index - 1) }" />
  </span>
</template>
