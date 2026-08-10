<script setup lang="ts">
defineProps<{ icon: string }>();
</script>
<template>
  <svg class="sector-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path v-if="icon === 'spark'" d="M13.5 2 5 13h6l-.5 9L19 10h-6l.5-8Z" />
    <path v-else-if="icon === 'crystal'" d="m8 3-5 7 9 11 9-11-5-7H8Zm0 0 4 18 4-18M3 10h18" />
    <path v-else-if="icon === 'leaf'" d="M20 4C11 4 5 7 5 14c0 3 2 5 5 5 7 0 10-7 10-15ZM4 21c2-6 6-9 12-12" />
    <path v-else d="M4 7c4-4 12-4 16 0-4 4-12 4-16 0Zm0 10c4-4 12-4 16 0M7 4v16m5-18v20m5-18v16" />
  </svg>
</template>
