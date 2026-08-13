<script setup lang="ts">
import { computed } from "vue";
import { Bot } from "@lucide/vue";
import type { BotProfile, PublicGameView } from "@richesses-espace/protocol";

const props = defineProps<{
  playerName: string;
  profile: BotProfile;
  phase: PublicGameView["phase"];
  revision: number;
  compact?: boolean;
}>();

const phrases = computed(() => {
  if (props.phase === "AUCTION") return ["calcule sa mise", "compare la valeur du lot", "évalue le risque"];
  if (props.phase === "WAITING_FOR_PURCHASE" || props.phase === "WAITING_FOR_LEVER_PURCHASE") {
    return ["compare les concessions", "vérifie ses réserves", "projette son influence"];
  }
  if (props.phase === "WAITING_FOR_TRADE") return ["analyse la proposition", "compare les échanges", "mesure l’opportunité"];
  if (props.phase === "WAITING_FOR_ROLL") return ["analyse la trajectoire", "calibre son impulsion", "prépare sa manœuvre"];
  return ["analyse les données", "compare les options", "calibre sa stratégie"];
});

const variant = computed(() => Array.from(`${props.playerName}:${props.revision}`)
  .reduce((total, character) => total + character.charCodeAt(0), 0) % 3);
const phrase = computed(() => phrases.value[variant.value]!);
const accessibleLabel = computed(() => `${props.playerName} réfléchit : ${phrase.value}.`);
</script>

<template>
  <div
    class="bot-thinking-indicator"
    :class="{ 'bot-thinking-indicator--compact': compact }"
    :data-profile="profile"
    :data-variant="variant"
    role="status"
    aria-live="polite"
    :aria-label="accessibleLabel"
  >
    <span class="bot-thinking-indicator__orbital" aria-hidden="true">
      <Bot :size="compact ? 14 : 18" />
    </span>
    <span class="bot-thinking-indicator__copy">
      <strong v-if="!compact">{{ playerName }}</strong>
      <span>{{ compact ? 'Réflexion' : phrase }}</span>
    </span>
    <span class="bot-thinking-indicator__signal" aria-hidden="true"><i /><i /><i /></span>
  </div>
</template>

<style scoped>
.bot-thinking-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .55rem;
  width: 100%;
  margin: .7rem 0 0;
  padding: .58rem .72rem;
  color: #c9e8f4;
  border: 1px solid rgba(53, 208, 226, .3);
  border-radius: 10px;
  background: linear-gradient(110deg, rgba(53, 208, 226, .1), rgba(128, 103, 232, .06));
  font-size: .75rem;
}

.bot-thinking-indicator__orbital {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  color: #6fddea;
  border: 1px solid rgba(111, 221, 234, .34);
  border-radius: 50%;
  background: rgba(6, 17, 31, .48);
  box-shadow: 0 0 14px rgba(53, 208, 226, .13);
}

.bot-thinking-indicator__orbital::after {
  position: absolute;
  inset: -3px;
  border: 2px solid transparent;
  border-top-color: #6fddea;
  border-radius: 50%;
  content: "";
  animation: bot-thinking-orbit 1.35s linear infinite;
}

.bot-thinking-indicator__copy { display: grid; min-width: 0; line-height: 1.15; text-align: left; }
.bot-thinking-indicator__copy strong { color: #f3f8fc; font-size: .76rem; }
.bot-thinking-indicator__copy span { color: #9ecddd; font-size: .64rem; white-space: nowrap; }
.bot-thinking-indicator__signal { display: inline-flex; align-items: center; gap: 3px; }
.bot-thinking-indicator__signal i { width: 4px; height: 4px; border-radius: 50%; background: #6fddea; animation: bot-thinking-pulse 1.05s ease-in-out infinite; }
.bot-thinking-indicator__signal i:nth-child(2) { animation-delay: .15s; }
.bot-thinking-indicator__signal i:nth-child(3) { animation-delay: .3s; }

.bot-thinking-indicator--compact {
  width: auto;
  margin: 0 0 0 .05rem;
  padding: 0;
  gap: .3rem;
  border: 0;
  background: none;
}
.bot-thinking-indicator--compact .bot-thinking-indicator__orbital { width: 1.45rem; height: 1.45rem; }
.bot-thinking-indicator--compact .bot-thinking-indicator__copy span { color: #6fddea; font-size: .62rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.bot-thinking-indicator--compact .bot-thinking-indicator__signal { gap: 2px; }
.bot-thinking-indicator--compact .bot-thinking-indicator__signal i { width: 3px; height: 3px; }

[data-profile="CAUTIOUS"] .bot-thinking-indicator__orbital::after { animation-duration: 1.65s; }
[data-profile="AMBITIOUS"] .bot-thinking-indicator__orbital::after { animation-duration: 1.05s; }
[data-variant="1"] .bot-thinking-indicator__orbital::after { animation-direction: reverse; }
[data-variant="2"] .bot-thinking-indicator__orbital::after { border-right-color: rgba(128, 103, 232, .72); }

@keyframes bot-thinking-orbit { to { transform: rotate(360deg); } }
@keyframes bot-thinking-pulse { 0%, 70%, 100% { opacity: .25; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-2px); } }

@media (prefers-reduced-motion: reduce) {
  .bot-thinking-indicator__orbital::after,
  .bot-thinking-indicator__signal i { animation: none; }
  .bot-thinking-indicator__signal i { opacity: .72; }
}
</style>
