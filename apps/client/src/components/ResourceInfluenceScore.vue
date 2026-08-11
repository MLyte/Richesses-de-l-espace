<script setup lang="ts">
import { computed, ref } from "vue";
import { ASSETS, RESOURCES, SECTORS } from "@richesses-espace/game";

const props = withDefaults(defineProps<{ resourceId: string; assetIds: readonly string[]; compact?: boolean; showRoyaltiesDetails?: boolean }>(), {
  showRoyaltiesDetails: true
});
const royaltiesOpen = ref(false);
const resource = computed(() => RESOURCES.find((item) => item.id === props.resourceId)!);
const sector = computed(() => SECTORS.find((item) => item.id === resource.value.sectorId)!);
const titles = computed(() => ASSETS.filter((asset) => asset.resourceId === props.resourceId && props.assetIds.includes(asset.id)));
const influence = computed(() => titles.value.reduce((total, title) => total + title.share, 0));
const reachedThreshold = computed(() => [90, 70, 50, 30].find((threshold) => influence.value >= threshold) ?? 0);
const nextThreshold = computed(() => [30, 50, 70, 90].find((threshold) => influence.value < threshold) ?? null);
const thresholds = [30, 50, 70, 90] as const;
const activeThreshold = computed(() => [...thresholds].reverse().find((threshold) => influence.value >= threshold) ?? null);
</script>

<template>
  <article class="resource-score" :class="{ compact }" :style="{ '--resource-color': sector.color }">
    <header><span>{{ resource.name }}</span><strong>{{ influence }}<small>%</small></strong></header>
    <div class="resource-score__track" role="meter" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="influence" :aria-label="`${influence} % de ${resource.name}`">
      <i :style="{ width: `${Math.min(100, influence)}%` }" />
      <b v-for="threshold in [30, 50, 70, 90]" :key="threshold" :class="{ reached: influence >= threshold }" :style="{ left: `${threshold}%` }"><span>{{ threshold }}</span></b>
    </div>
    <footer>
      <span v-if="nextThreshold">Prochain palier <b>{{ nextThreshold }} %</b> · encore {{ nextThreshold - influence }} %</span>
      <span v-else>Palier maximal <b>90 %</b> atteint</span>
      <em v-if="reachedThreshold">Droits niveau {{ reachedThreshold }} %</em>
      <ul class="resource-score__titles" aria-label="Cartes composant ce pourcentage">
        <li v-for="title in titles" :key="title.id"><span>{{ title.hub }}</span><b>+{{ title.share }} %</b></li>
      </ul>
      <button v-if="showRoyaltiesDetails" class="resource-score__rent-button" type="button" @click="royaltiesOpen = true">Voir les droits</button>
    </footer>
  </article>

  <Teleport to="body">
    <div v-if="showRoyaltiesDetails && royaltiesOpen" class="resource-rent-backdrop" @click.self="royaltiesOpen = false">
      <section class="resource-rent-dialog" role="dialog" aria-modal="true" :aria-label="`Loyers de ${resource.name}`">
        <button class="resource-rent-dialog__close" type="button" aria-label="Fermer" @click="royaltiesOpen = false">×</button>
        <p class="eyebrow">Barème de la ressource</p>
        <h2>{{ resource.name }}</h2>
        <div class="resource-rent-dialog__current" :style="{ '--resource-color': sector.color }"><span>Votre cumul actuel</span><strong>{{ influence }} %</strong></div>
        <p>Lorsqu’un autre équipage visite une case <strong>{{ resource.name }}</strong>, vos droits d’extraction dépendent du plus haut seuil atteint, tous mondes producteurs confondus.</p>
        <ol class="resource-rent-table">
          <li v-for="threshold in thresholds" :key="threshold" :class="{ reached: influence >= threshold, active: activeThreshold === threshold }">
            <span><b>{{ threshold }} %</b><small>{{ influence >= threshold ? 'Seuil atteint' : `Encore ${threshold - influence} %` }}</small></span>
            <strong>{{ resource.royalties[threshold] }} crédit{{ resource.royalties[threshold] > 1 ? 's' : '' }}</strong>
          </li>
        </ol>
        <p v-if="!activeThreshold" class="resource-rent-dialog__notice">Aucun loyer n’est encore dû : il faut atteindre au moins 30 %.</p>
        <p v-else class="resource-rent-dialog__notice active">Droit actuel : <strong>{{ resource.royalties[activeThreshold] }} crédit{{ resource.royalties[activeThreshold] > 1 ? 's' : '' }}</strong>.</p>
      </section>
    </div>
  </Teleport>
</template>
