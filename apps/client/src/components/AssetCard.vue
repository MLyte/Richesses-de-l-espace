<script setup lang="ts">
import { computed } from "vue";
import { ASSETS, COUNTRIES, RESOURCES, SPACE_REGIONS } from "@richesses-espace/game";
import { Orbit } from "@lucide/vue";
import { imageById } from "../assets/assets-manifest";

const props = defineProps<{ assetId: string; price?: number | null; owner?: string | null; compact?: boolean }>();
const asset = computed(() => ASSETS.find((item) => item.id === props.assetId));
const world = computed(() => COUNTRIES.find((item) => item.id === asset.value?.worldId));
const region = computed(() => SPACE_REGIONS.find((item) => item.id === world.value?.sectorId));
const resource = computed(() => RESOURCES.find((item) => item.id === asset.value?.resourceId));
const image = computed(() => asset.value ? imageById.get(asset.value.imageId) : undefined);
</script>

<template>
  <article v-if="asset && region" class="asset-card" :class="{ compact }" :style="{ '--sector': region.color }">
    <picture v-if="image">
      <source :srcset="`${image.file.replace('.webp', '-480.avif')} 480w, ${image.file.replace('.webp', '-960.avif')} 960w, ${image.file.replace('.webp', '.avif')} 1600w`" type="image/avif" />
      <source :srcset="`${image.file.replace('.webp', '-480.webp')} 480w, ${image.file.replace('.webp', '-960.webp')} 960w, ${image.file} 1600w`" type="image/webp" />
      <img :src="image.file" :alt="image.alt" :style="{ objectPosition: `${image.focalPoint.x}% ${image.focalPoint.y}%` }" />
    </picture>
    <div class="asset-card__wash" />
    <div class="asset-card__content">
      <div class="asset-card__sector"><Orbit :size="18" aria-hidden="true" /> {{ region.name }}</div>
      <div>
        <p>{{ asset.hub }}</p>
        <h2>{{ resource?.name }}</h2>
      </div>
      <footer>
        <span v-if="price != null"><b>{{ price }}</b> crédits</span>
        <span v-else>Licence <b>{{ asset.purchasePrice }}</b></span>
        <span class="asset-card__share"><b>{{ asset.sharePercent }} %</b> galactique</span>
        <span v-if="owner" class="asset-card__owner">Consortium {{ owner }}</span>
      </footer>
    </div>
  </article>
</template>
