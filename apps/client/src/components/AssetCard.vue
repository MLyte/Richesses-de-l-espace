<script setup lang="ts">
import { computed } from "vue";
import { ASSETS, RESOURCES, SECTORS } from "@orbisium/game";
import { imageById } from "../assets/assets-manifest";
import SectorIcon from "./SectorIcon.vue";

const props = defineProps<{ assetId: string; price?: number | null; owner?: string | null; compact?: boolean }>();
const asset = computed(() => ASSETS.find((item) => item.id === props.assetId));
const sector = computed(() => SECTORS.find((item) => item.id === asset.value?.sectorId));
const resource = computed(() => RESOURCES.find((item) => item.id === asset.value?.resourceId));
const image = computed(() => asset.value ? imageById.get(asset.value.imageId) : undefined);
</script>

<template>
  <article v-if="asset && sector" class="asset-card" :class="{ compact }" :style="{ '--sector': sector.color }">
    <picture v-if="image">
      <source :srcset="`${image.file.replace('.webp', '-480.avif')} 480w, ${image.file.replace('.webp', '-960.avif')} 960w, ${image.file.replace('.webp', '.avif')} 1600w`" type="image/avif" />
      <source :srcset="`${image.file.replace('.webp', '-480.webp')} 480w, ${image.file.replace('.webp', '-960.webp')} 960w, ${image.file} 1600w`" type="image/webp" />
      <img :src="image.file" :alt="image.alt" :style="{ objectPosition: `${image.focalPoint.x}% ${image.focalPoint.y}%` }" />
    </picture>
    <div class="asset-card__wash" />
    <div class="asset-card__content">
      <div class="asset-card__sector"><SectorIcon :icon="sector.icon" /> {{ sector.shortName }}</div>
      <div>
        <p>{{ asset.hub }}</p>
        <h2>{{ resource?.name }}</h2>
      </div>
      <footer>
        <span v-if="price != null"><b>{{ price }}</b> crédits</span>
        <span v-else>Base <b>{{ asset.basePrice }}</b></span>
        <span class="asset-card__share"><b>{{ asset.share }} %</b> mondial</span>
        <span v-if="owner" class="asset-card__owner">Collection de {{ owner }}</span>
      </footer>
    </div>
  </article>
</template>
