<script setup lang="ts">
import { X } from "@lucide/vue";

defineProps<{ message: string }>();
defineEmits<{ dismiss: [] }>();
</script>

<template>
  <aside class="error-toast" role="alert" aria-live="assertive">
    <span>{{ message }}</span>
    <button type="button" aria-label="Fermer le message d’erreur" @click="$emit('dismiss')">
      <X :size="19" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.error-toast {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  gap: .65rem;
  padding: .55rem .55rem .55rem 1rem;
  border: 1px solid #ff9a83;
  border-radius: 12px;
}
.error-toast span { min-width: 0; font-size: .875rem; font-weight: 700; line-height: 1.4; }
.error-toast button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, .72);
  border-radius: 9px;
  background: rgba(6, 17, 31, .28);
}
</style>
