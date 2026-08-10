<script setup lang="ts">
import { licensedImages } from "../assets/assets-manifest";
</script>
<template>
  <main class="credits-shell"><RouterLink to="/display" class="back-link">← Retour à la table</RouterLink><p class="eyebrow">Sources visuelles</p><h1>Crédits<br><em>photographiques.</em></h1><p class="credits-intro">Les images sont intégrées localement et traitées pour l’univers éditorial d’Orbisium. Merci aux photographes qui les ont rendues disponibles.</p><div class="credits-grid"><article v-for="image in licensedImages" :key="image.id"><img :src="image.file" :alt="image.alt" /><div><b>{{ image.author }}</b><a :href="image.sourceUrl" target="_blank" rel="noreferrer">Photographie sur Unsplash ↗</a></div></article></div><p class="license-note">Images utilisées conformément à la <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">licence Unsplash</a>. Téléchargées le {{ licensedImages[0]?.downloadedAt }}.</p></main>
</template>
