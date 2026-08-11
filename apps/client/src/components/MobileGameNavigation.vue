<script setup lang="ts">
import { Dices, Map as MapIcon, PackageOpen } from "@lucide/vue";

defineProps<{
  active: "play" | "map" | "resources";
  hasImmediateAction: boolean;
  activePlayerName: string | undefined;
  resourceCount: number;
}>();

defineEmits<{
  play: [];
  map: [];
  resources: [];
}>();
</script>

<template>
  <nav class="mobile-only-navigation" aria-label="Navigation de la partie">
    <button type="button" :class="{ active: active === 'play' }" :aria-current="active === 'play' ? 'page' : undefined" @click="$emit('play')">
      <Dices :size="21" aria-hidden="true" />
      <span>Jouer</span>
      <b v-if="hasImmediateAction">Action</b>
    </button>
    <button type="button" :class="{ active: active === 'map' }" :aria-current="active === 'map' ? 'page' : undefined" @click="$emit('map')">
      <MapIcon :size="21" aria-hidden="true" />
      <span>Carte</span>
      <b v-if="activePlayerName">{{ activePlayerName }}</b>
    </button>
    <button type="button" :class="{ active: active === 'resources' }" :aria-current="active === 'resources' ? 'page' : undefined" @click="$emit('resources')">
      <PackageOpen :size="21" aria-hidden="true" />
      <span>Ressources</span>
      <b>{{ resourceCount }}</b>
    </button>
  </nav>
</template>
