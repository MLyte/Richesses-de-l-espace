<script setup lang="ts">
import { computed } from "vue";
import {
  Circle,
  CircleCheck,
  Coins,
  Cpu,
  Gift,
  Globe2,
  Gavel,
  MapPin,
  Newspaper,
  PackageOpen,
  Plus,
  ShieldAlert,
  Sparkles,
  Waypoints
} from "@lucide/vue";

const props = defineProps<{ name: string }>();

const icons = {
  start: MapPin,
  purchase: Plus,
  payment: Coins,
  resolved: CircleCheck,
  trend: Newspaper,
  joker: Cpu,
  auction: Gavel,
  dividend: Gift,
  customs: ShieldAlert,
  regional: Waypoints,
  global: Globe2,
  reward: Sparkles,
  neutral: Circle,
  empty: PackageOpen
} as const;

const icon = computed(() => icons[props.name as keyof typeof icons] ?? Circle);
</script>

<template>
  <component :is="icon" class="game-icon" aria-hidden="true" />
</template>
