<script setup lang="ts">
import { X } from "@lucide/vue";

defineProps<{ message: string }>();
defineEmits<{ dismiss: [] }>();
</script>

<template>
  <aside class="error-toast" role="alert" aria-live="assertive">
    <button class="error-toast__dismiss" type="button" aria-label="Fermer le message d’erreur" @click="$emit('dismiss')">
      <span>{{ message }}</span>
      <X :size="19" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.error-toast {
  width: min(calc(100% - 2rem), 360px);
  padding: 0;
  border: 1px solid #ff9a83;
  border-radius: 12px;
}
.error-toast__dismiss {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: .65rem;
  width: 100%;
  min-height: 54px;
  padding: .55rem .8rem .55rem 1rem;
  color: inherit;
  border: 0;
  border-radius: inherit;
  background: transparent;
  text-align: left;
}
.error-toast__dismiss:hover { background: rgba(6, 17, 31, .12); }
.error-toast__dismiss:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.error-toast span { min-width: 0; font-size: .875rem; font-weight: 700; line-height: 1.4; }
</style>
