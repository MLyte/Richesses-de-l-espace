<script setup lang="ts">
import StaticDemoControls from "./components/StaticDemoControls.vue";
import StaticDemoWelcomeDialog from "./components/StaticDemoWelcomeDialog.vue";

const staticDemo = import.meta.env.VITE_STATIC_DEMO === "true";
</script>

<template><RouterView /><StaticDemoControls v-if="staticDemo" /><StaticDemoWelcomeDialog v-if="staticDemo" /></template>
