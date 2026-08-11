<script setup lang="ts">
import type { PublicPlayerView } from "@richesses-espace/protocol";
import GameIcon from "./GameIcon.vue";
import PlayerTokenIcon from "./PlayerTokenIcon.vue";

defineProps<{ payer: PublicPlayerView; recipient: PublicPlayerView; amount: number }>();
</script>

<template>
  <div class="payment-transfer" role="status" :aria-label="`${payer.name} doit verser ${amount} crédits à ${recipient.name}`">
    <div class="payment-transfer__player">
      <i class="player-token" :style="{ background: payer.color }"><PlayerTokenIcon :symbol="payer.symbol" /></i>
      <strong>{{ payer.name }}</strong>
    </div>
    <div class="payment-transfer__route" aria-hidden="true">
      <span><GameIcon name="payment" /></span>
      <b>{{ amount }}</b>
      <i /><i /><i />
    </div>
    <div class="payment-transfer__player">
      <i class="player-token" :style="{ background: recipient.color }"><PlayerTokenIcon :symbol="recipient.symbol" /></i>
      <strong>{{ recipient.name }}</strong>
    </div>
  </div>
</template>
