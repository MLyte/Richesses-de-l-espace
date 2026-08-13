<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { X } from "@lucide/vue";
import { createMobileToastQueue, type MobileToastNotice, type MobileToastQueueSnapshot } from "./mobile-toast-queue";

const props = defineProps<{
  event: MobileToastNotice | null;
  turnNotice: MobileToastNotice | null;
}>();

const state = ref<MobileToastQueueSnapshot>({ current: null, pendingCount: 0 });
const queue = createMobileToastQueue((snapshot) => { state.value = snapshot; });

watch(() => props.event?.key ?? null, () => {
  if (props.event) queue.enqueue(props.event);
}, { immediate: true });
watch(() => props.turnNotice?.key ?? null, () => {
  if (props.turnNotice) queue.enqueue(props.turnNotice);
}, { immediate: true });
onBeforeUnmount(queue.dispose);
</script>

<template>
  <Transition name="mobile-toast" mode="out-in">
    <aside v-if="state.current" :key="state.current.key" class="mobile-live-toast" role="status" aria-live="polite" aria-atomic="true">
      <button class="mobile-live-toast__dismiss" type="button" :aria-label="state.pendingCount ? 'Fermer le message et afficher le suivant' : 'Fermer le message'" @click="queue.dismiss">
        <p>{{ state.current.message }}</p>
        <span v-if="state.pendingCount" class="mobile-live-toast__pending">+{{ state.pendingCount }}</span>
        <X :size="18" aria-hidden="true" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.mobile-live-toast {
  position: fixed;
  z-index: var(--layer-toast);
  top: calc(var(--phone-header-height) + var(--safe-top) + .5rem);
  left: 50%;
  width: min(calc(100% - 2rem), 430px);
  transform: translateX(-50%);
  color: #f3f8fc;
  border: 1px solid rgba(111, 221, 234, .72);
  border-radius: 12px;
  background: rgba(11, 36, 58, .96);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .38);
}
.mobile-live-toast__dismiss {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: .65rem;
  width: 100%;
  min-height: 54px;
  padding: .35rem .8rem .35rem 1rem;
  color: inherit;
  border: 0;
  border-radius: inherit;
  background: transparent;
  text-align: left;
}
.mobile-live-toast p {
  min-width: 0;
  margin: 0;
  font-size: .875rem;
  font-weight: 800;
  line-height: 1.35;
  text-align: left;
}
.mobile-live-toast__pending {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 .4rem;
  color: #06111f;
  border-radius: 999px;
  background: #6fddea;
  font: 800 .68rem "IBM Plex Mono", monospace;
}
.mobile-live-toast__dismiss:hover { background: rgba(111, 221, 234, .12); }
.mobile-live-toast__dismiss:focus-visible {
  outline: 2px solid #f3f8fc;
  outline-offset: 2px;
}
.mobile-toast-enter-active,
.mobile-toast-leave-active { transition: opacity .22s ease, transform .22s ease; }
.mobile-toast-enter-from { opacity: 0; transform: translate(-50%, -10px); }
.mobile-toast-leave-to { opacity: 0; transform: translate(-50%, -6px) scale(.98); }
@media (prefers-reduced-motion: reduce) {
  .mobile-toast-enter-active,
  .mobile-toast-leave-active { transition-duration: .01ms; }
}
</style>
