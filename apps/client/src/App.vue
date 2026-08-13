<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import StaticDemoWelcomeDialog from "./components/StaticDemoWelcomeDialog.vue";
import { startViewportSync } from "./composables/viewport";

const localGame = import.meta.env.VITE_LOCAL_GAME === "true";
let stopViewportSync: (() => void) | undefined;

onMounted(() => { stopViewportSync = startViewportSync(); });
onBeforeUnmount(() => stopViewportSync?.());
</script>

<template><RouterView /><StaticDemoWelcomeDialog v-if="localGame" /></template>
