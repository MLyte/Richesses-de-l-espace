<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import StaticDemoWelcomeDialog from "./components/StaticDemoWelcomeDialog.vue";
import { startAppLifecycle } from "./composables/app-lifecycle";
import { startViewportSync } from "./composables/viewport";
import { useGameStore } from "./stores/game";

const localGame = import.meta.env.VITE_LOCAL_GAME === "true";
const store = useGameStore();
let stopViewportSync: (() => void) | undefined;
let stopAppLifecycle: (() => void) | undefined;

onMounted(() => {
  stopViewportSync = startViewportSync();
  stopAppLifecycle = startAppLifecycle({
    onBackground: store.handleAppBackground,
    onForeground: store.handleAppForeground
  });
});
onBeforeUnmount(() => {
  stopViewportSync?.();
  stopAppLifecycle?.();
});
</script>

<template><RouterView /><StaticDemoWelcomeDialog v-if="localGame" /></template>
