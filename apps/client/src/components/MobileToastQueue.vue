<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { Bell, ChevronDown, X } from "@lucide/vue";
import { createMobileToastQueue, type MobileToastNotice, type MobileToastQueueSnapshot } from "./mobile-toast-queue";

const props = defineProps<{
  event: MobileToastNotice | null;
  turnNotice: MobileToastNotice | null;
  error: MobileToastNotice | null;
}>();
const emit = defineEmits<{ dismissError: [] }>();

const state = ref<MobileToastQueueSnapshot>({ current: null, pendingCount: 0, history: [], unreadCount: 0 });
const historyOpen = ref(false);
const queue = createMobileToastQueue((snapshot) => { state.value = snapshot; });

watch(() => props.event?.key ?? null, () => {
  if (props.event) queue.enqueue(props.event);
}, { immediate: true });
watch(() => props.turnNotice?.key ?? null, () => {
  if (props.turnNotice) queue.enqueue(props.turnNotice);
}, { immediate: true });
watch(() => props.error?.key ?? null, () => {
  if (props.error) queue.enqueue(props.error);
}, { immediate: true });
function toggleHistory() {
  historyOpen.value = !historyOpen.value;
  if (historyOpen.value) queue.markRead();
}
function dismissCurrent() {
  if (state.value.current?.kind === "error") emit("dismissError");
  queue.dismiss();
}
onBeforeUnmount(queue.dispose);
</script>

<template>
  <aside v-if="state.current || state.history.length" class="mobile-notification-center" :class="state.current ? `is-${state.current.kind}` : ''" aria-label="Centre de notifications">
    <div v-if="state.current" class="mobile-notification-center__current" role="status" :aria-live="state.current.kind === 'error' ? 'assertive' : 'polite'" aria-atomic="true">
      <Bell :size="18" aria-hidden="true" />
      <p>{{ state.current.message }} <b v-if="(state.current.count ?? 1) > 1">×{{ state.current.count }}</b></p>
      <button type="button" :aria-label="state.current.kind === 'error' ? 'Acquitter l’erreur' : 'Fermer le message'" @click="dismissCurrent"><X :size="18" aria-hidden="true" /></button>
    </div>
    <button class="mobile-notification-center__history-toggle" type="button" :aria-expanded="historyOpen" @click="toggleHistory">
      <span>Historique</span>
      <b v-if="state.unreadCount">{{ state.unreadCount }}</b>
      <small v-else-if="state.pendingCount">+{{ state.pendingCount }}</small>
      <ChevronDown :size="17" :class="{ rotated: historyOpen }" aria-hidden="true" />
    </button>
    <Transition name="mobile-history">
      <ol v-if="historyOpen" class="mobile-notification-center__history">
        <li v-for="notice in state.history" :key="notice.key" :class="`is-${notice.kind}`">
          <span>{{ notice.kind === 'error' ? 'Alerte' : notice.kind === 'turn' ? 'Tour' : 'Événement' }}</span>
          <p>{{ notice.message }}</p>
          <b v-if="(notice.count ?? 1) > 1">×{{ notice.count }}</b>
        </li>
      </ol>
    </Transition>
  </aside>
</template>

<style scoped>
.mobile-notification-center {
  position: relative;
  z-index: calc(var(--layer-action) + 1);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  width: min(calc(100% - 1rem), 520px);
  margin: .45rem auto 0;
  color: #f3f8fc;
  border: 1px solid rgba(111, 221, 234, .72);
  border-radius: 12px;
  background: rgba(11, 36, 58, .96);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .24);
}
.mobile-notification-center.is-error { border-color: #ff9d8c; background: #4a1f24; }
.mobile-notification-center__current {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: .5rem;
  min-height: 48px;
  padding: .3rem .35rem .3rem .7rem;
}
.mobile-notification-center__current p {
  min-width: 0;
  margin: 0;
  font-size: .78rem;
  font-weight: 800;
  line-height: 1.3;
  text-align: left;
}
.mobile-notification-center button { color: inherit; border: 0; background: transparent; }
.mobile-notification-center__current button { display: grid; place-items: center; width: 44px; min-height: 44px; border-radius: 9px; }
.mobile-notification-center__history-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .3rem;
  min-width: 92px;
  min-height: 48px;
  padding: .25rem .55rem;
  border-left: 1px solid rgba(111, 221, 234, .28) !important;
  font: 800 .65rem "IBM Plex Mono", monospace;
}
.mobile-notification-center__history-toggle b,
.mobile-notification-center__history-toggle small {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  margin: 0;
  padding: 0 .3rem;
  color: #06111f;
  border-radius: 999px;
  background: #6fddea;
  font: 800 .62rem "IBM Plex Mono", monospace;
}
.mobile-notification-center__history-toggle svg { transition: transform .18s ease; }
.mobile-notification-center__history-toggle svg.rotated { transform: rotate(180deg); }
.mobile-notification-center__history {
  grid-column: 1 / -1;
  display: grid;
  gap: .35rem;
  max-height: min(42dvh, 340px);
  margin: 0;
  padding: .5rem;
  overflow-y: auto;
  border-top: 1px solid rgba(111, 221, 234, .25);
  list-style: none;
}
.mobile-notification-center__history li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .45rem; padding: .45rem .55rem; border-radius: 8px; background: rgba(255,255,255,.06); }
.mobile-notification-center__history li.is-error { background: rgba(242,103,74,.2); }
.mobile-notification-center__history span { color: #9ec2d8; font: 800 .58rem "IBM Plex Mono", monospace; text-transform: uppercase; }
.mobile-notification-center__history p { margin: 0; font-size: .72rem; line-height: 1.35; }
.mobile-notification-center__history li > b { font-size: .65rem; }
.mobile-history-enter-active,
.mobile-history-leave-active { transition: opacity .18s ease, transform .18s ease; }
.mobile-history-enter-from,
.mobile-history-leave-to { opacity: 0; transform: translateY(-5px); }
@media (prefers-reduced-motion: reduce) {
  .mobile-history-enter-active,
  .mobile-history-leave-active { transition-duration: .01ms; }
}
</style>
