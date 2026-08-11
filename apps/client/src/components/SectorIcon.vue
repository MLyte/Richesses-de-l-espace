<script setup lang="ts">
import { computed } from "vue";
import { Gem, Leaf, Route, Waves, Zap } from "@lucide/vue";

const props = defineProps<{ icon: string }>();
const icons = { crystal: Gem, leaf: Leaf, spark: Zap, fiber: Waves, route: Route } as const;
const component = computed(() => icons[props.icon as keyof typeof icons] ?? Waves);
</script>
<template>
  <component :is="component" class="sector-icon" aria-hidden="true" />
</template>