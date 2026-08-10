<script setup lang="ts">
import { computed } from "vue";
import { Bird, Bug, Cat, Dog, Fish, Rabbit, Rat, Shrimp, Snail, Squirrel, Turtle, Worm } from "@lucide/vue";

const props = defineProps<{ symbol: string }>();

const icons = {
  cat: Cat,
  dog: Dog,
  bird: Bird,
  fish: Fish,
  rabbit: Rabbit,
  turtle: Turtle,
  snail: Snail,
  squirrel: Squirrel,
  rat: Rat,
  bug: Bug,
  worm: Worm,
  shrimp: Shrimp
} as const;

const icon = computed(() => icons[props.symbol as keyof typeof icons] ?? Cat);
</script>

<template>
  <component :is="icon" class="player-token-icon" aria-hidden="true" />
</template>
