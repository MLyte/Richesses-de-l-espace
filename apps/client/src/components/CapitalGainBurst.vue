<script setup lang="ts">
import { Coins } from "@lucide/vue";

const props = withDefaults(defineProps<{ amount: number; variant?: "phone" | "tv" }>(), { variant: "phone" });
const formattedAmount = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 0 }).format(Math.round(props.amount));
</script>

<template>
  <span class="capital-gain-burst" :class="`capital-gain-burst--${variant}`" aria-hidden="true">
    <span class="capital-gain-burst__halo" />
    <i v-for="particle in 8" :key="particle" class="capital-gain-burst__particle" :style="{ '--particle': particle }" />
    <span class="capital-gain-burst__amount"><Coins :size="variant === 'tv' ? 17 : 19" /><strong>+{{ formattedAmount }}</strong><small>cr.</small></span>
  </span>
</template>

<style scoped>
.capital-gain-burst {
  --burst-size: 92px;
  position: absolute;
  z-index: 12;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  color: #fff4b7;
  pointer-events: none;
}
.capital-gain-burst__amount {
  position: absolute;
  left: 0;
  bottom: 0;
  display: inline-flex;
  align-items: center;
  gap: .28rem;
  min-width: max-content;
  padding: .42rem .62rem;
  border: 1px solid rgba(255, 224, 116, .86);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(29, 108, 127, .98), rgba(13, 39, 70, .98));
  box-shadow: 0 0 0 1px rgba(53, 208, 226, .22), 0 8px 26px rgba(0, 0, 0, .46), 0 0 26px rgba(255, 206, 77, .26);
  font: 800 .92rem "IBM Plex Mono", monospace;
  animation: capital-gain-rise 1.8s cubic-bezier(.2, .75, .2, 1) both;
}
.capital-gain-burst__amount svg { flex: none; color: #ffe074; filter: drop-shadow(0 0 5px rgba(255, 224, 116, .72)); }
.capital-gain-burst__amount strong { color: #fff; }
.capital-gain-burst__amount small { color: #bfeaf0; font: 700 .62em Manrope, sans-serif; }
.capital-gain-burst__halo {
  position: absolute;
  inset: calc(var(--burst-size) / -2);
  border: 1px solid rgba(111, 221, 234, .8);
  border-radius: 50%;
  box-shadow: inset 0 0 18px rgba(53, 208, 226, .22), 0 0 18px rgba(53, 208, 226, .2);
  animation: capital-gain-halo 1.25s ease-out both;
}
.capital-gain-burst__particle {
  --angle: calc((var(--particle) - 1) * 45deg);
  position: absolute;
  top: -3px;
  left: -3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--particle-color, #ffe074);
  box-shadow: 0 0 10px currentColor;
  animation: capital-gain-particle 1.1s calc((var(--particle) - 1) * 22ms) ease-out both;
}
.capital-gain-burst__particle:nth-of-type(3n) { --particle-color: #6fddea; }
.capital-gain-burst__particle:nth-of-type(4n) { --particle-color: #fff; width: 4px; height: 4px; }
.capital-gain-burst--tv { --burst-size: 76px; left: 58%; }
.capital-gain-burst--tv .capital-gain-burst__amount { padding: .32rem .5rem; font-size: .78rem; }

@keyframes capital-gain-rise {
  0% { opacity: 0; transform: translate(-50%, 14px) scale(.55); }
  16% { opacity: 1; transform: translate(-50%, -9px) scale(1.12); }
  48% { opacity: 1; transform: translate(-50%, -20px) scale(1); }
  78% { opacity: 1; transform: translate(-50%, -27px) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -42px) scale(.92); }
}
@keyframes capital-gain-halo {
  0% { opacity: 0; transform: scale(.08) rotate(-35deg); }
  24% { opacity: .95; }
  100% { opacity: 0; transform: scale(1.15) rotate(22deg); }
}
@keyframes capital-gain-particle {
  0% { opacity: 0; transform: rotate(var(--angle)) translateX(5px) scale(.4); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: rotate(var(--angle)) translateX(calc(var(--burst-size) / 2)) scale(0); }
}

@media (prefers-reduced-motion: reduce) {
  .capital-gain-burst__halo,
  .capital-gain-burst__particle { display: none; }
  .capital-gain-burst__amount { animation: capital-gain-fade 1.5s ease both; }
  @keyframes capital-gain-fade {
    0%, 100% { opacity: 0; transform: translate(-50%, -20px); }
    15%, 80% { opacity: 1; transform: translate(-50%, -20px); }
  }
}
</style>
