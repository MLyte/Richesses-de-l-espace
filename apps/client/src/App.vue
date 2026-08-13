<script setup lang="ts">
import StaticDemoWelcomeDialog from "./components/StaticDemoWelcomeDialog.vue";

const localGame = import.meta.env.VITE_LOCAL_GAME === "true";
</script>

<template><RouterView /><StaticDemoWelcomeDialog v-if="localGame" /></template>
