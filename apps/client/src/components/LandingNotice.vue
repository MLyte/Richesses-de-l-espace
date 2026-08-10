<script setup lang="ts">
import { computed } from "vue";
import { ASSETS, COUNTRIES, LEVER_CARDS, RESOURCES, TREND_CARDS } from "@orbisium/game";
import type { PublicGameView } from "@orbisium/protocol";
import AssetCard from "./AssetCard.vue";
import GameIcon from "./GameIcon.vue";

const props = defineProps<{ game: PublicGameView; compact?: boolean }>();
const space = computed(() => props.game.board.find((item) => item.id === props.game.landedSpaceId) ?? null);
const asset = computed(() => {
  const landed = space.value;
  return landed?.type === "asset" ? ASSETS.find((item) => item.id === landed.assetId) ?? null : null;
});
const active = computed(() => props.game.players.find((player) => player.id === props.game.activePlayerId) ?? null);
const country = computed(() => COUNTRIES.find((item) => item.id === asset.value?.countryId) ?? null);
const resource = computed(() => RESOURCES.find((item) => item.id === asset.value?.resourceId) ?? null);
const specialResource = computed(() => {
  const landed = space.value;
  if (!landed || landed.type !== "special" || landed.kind !== "dividend") return null;
  return RESOURCES.find((item) => item.id === landed.resourceId) ?? null;
});
const owner = computed(() => props.game.players.find((player) => player.id === props.game.pendingPayment?.recipientId) ?? null);
const card = computed(() => props.game.lastCard?.kind === "trend" ? TREND_CARDS.find((item) => item.id === props.game.lastCard?.id) : props.game.lastCard?.kind === "lever" ? LEVER_CARDS.find((item) => item.id === props.game.lastCard?.id) : null);
const currentPrice = computed(() => asset.value?.basePrice ?? null);

const meta = computed(() => {
  const landed = space.value;
  if (!landed) return null;
  if (landed.type === "hub") return { icon: "start", eyebrow: "Point de passage", title: landed.name, status: "Aucun effet", tone: "neutral", description: "Cette case sert de repère au parcours. Aucun paiement, achat ou tirage n’est déclenché : le tour peut être terminé." };
  if (landed.type === "asset") {
    const title = `${country.value?.name ?? "Pays"} · ${resource.value?.name ?? "Ressource"}`;
    if (props.game.phase === "WAITING_FOR_PURCHASE") return { icon: "purchase", eyebrow: `${country.value?.continent ?? "Continent"} · achats`, title, status: "Choix de titres", tone: "action", description: `${active.value?.name ?? "Le joueur actif"} peut acheter jusqu’à six titres encore disponibles produits par ${country.value?.name ?? "ce pays"}. Les royalties de ${resource.value?.name ?? "la ressource"} seront calculées ensuite.` };
    if (props.game.phase === "WAITING_FOR_PAYMENT" && props.game.pendingPayment) return { icon: "payment", eyebrow: `${country.value?.name ?? "Pays"} · royalties`, title, status: "Paiement requis", tone: "warning", description: `${active.value?.name ?? "Le joueur actif"} doit verser ${props.game.pendingPayment.amount} crédit${props.game.pendingPayment.amount > 1 ? "s" : ""} à ${owner.value?.name ?? "un détenteur"}, qui possède au moins 30 % de ${resource.value?.name ?? "cette ressource"}.` };
    return { icon: "resolved", eyebrow: `${country.value?.continent ?? "Continent"} · case classique`, title, status: "Deux étapes résolues", tone: "owned", description: `Les achats de titres de ${country.value?.name ?? "ce pays"} puis toutes les royalties de ${resource.value?.name ?? "la ressource"} ont été traités.` };
  }
  if (landed.kind === "trend") return { icon: "trend", eyebrow: "Case Tendance", title: landed.name, status: "Effet appliqué", tone: "trend", description: card.value ? `${card.value.title} — ${card.value.description}` : "Une carte Tendance a été révélée : la somme indiquée a été donnée ou reçue immédiatement." };
  if (landed.kind === "joker") return props.game.phase === "WAITING_FOR_LEVER_PURCHASE" && props.game.pendingLever ? { icon: "joker", eyebrow: "Case Joker", title: landed.name, status: "Décision requise", tone: "lever", description: `${active.value?.name ?? "Le joueur actif"} peut acheter un Joker d’exemption pour ${props.game.pendingLever.price} crédits ou passer.` } : { icon: "joker", eyebrow: "Case Joker", title: landed.name, status: card.value ? "Joker acheté" : (props.game.players.filter((player) => !player.bankrupt).length <= 2 ? "Case de repos" : "Offre refusée"), tone: "lever", description: card.value ? `${active.value?.name ?? "Le joueur actif"} achète « ${card.value.title} » : ${card.value.description}` : (props.game.players.filter((player) => !player.bankrupt).length <= 2 ? "À deux joueurs, les cases Joker ne produisent plus aucun effet." : "Le Joker n’a pas été acheté et reste disponible dans la pioche.") };
  if (landed.kind === "auction") return { icon: "auction", eyebrow: "Case Appel d’offres", title: landed.name, status: props.game.phase === "AUCTION" ? "En cours" : "Résolu", tone: "auction", description: props.game.phase === "AUCTION" ? (props.game.auction?.mode === "selection" ? `${active.value?.name ?? "Le vendeur"} sélectionne le nombre de titres indiqué par le dé rouge. Les titres d’une même ressource restent groupés.` : "La mise commence à la moitié exacte du prix d’achat. Chaque surenchère augmente d’au moins 0,1 crédit et relance le délai de 10 secondes.") : "Cette case ne s’active qu’après un tour complet et reste une case de repos lorsqu’il ne reste que deux joueurs." };
  if (landed.kind === "dividend") return { icon: "dividend", eyebrow: "Case Dividende", title: specialResource.value?.name ?? landed.name, status: props.game.phase === "WAITING_FOR_PAYMENT" ? "Retombées à régler" : "Prime reçue", tone: "trend", description: `${active.value?.name ?? "Le joueur actif"} reçoit ${(props.game.lastRoll?.total ?? 0) * .5} crédits (${props.game.lastRoll?.total ?? 0} × 0,5), puis règle les retombées de ${specialResource.value?.name ?? "la ressource associée"}.` };
  if (landed.kind === "regional_choice") return { icon: "regional", eyebrow: "Comptoir régional", title: landed.regionName, status: props.game.phase === "WAITING_FOR_PURCHASE" ? "Choix de titres" : "Résolu", tone: "action", description: props.game.phase === "WAITING_FOR_PURCHASE" ? `${active.value?.name ?? "Le joueur actif"} peut acheter jusqu’à six titres de cette région, uniquement pour des ressources déjà présentes dans sa collection.` : `Les territoires concernés sont : ${landed.continents.join(", ")}. Aucun titre admissible n’était disponible ou le choix est terminé.` };
  if (landed.kind === "global_choice") return { icon: "global", eyebrow: "Mandat global", title: landed.name, status: props.game.phase === "WAITING_FOR_PURCHASE" ? "Choix mondial" : "Résolu", tone: "action", description: props.game.phase === "WAITING_FOR_PURCHASE" ? `${active.value?.name ?? "Le joueur actif"} peut compléter jusqu’à six titres de ressources déjà possédées, partout dans le monde.` : "Le Mandat global ne s’active qu’après un tour complet du plateau." };
  return { icon: "customs", eyebrow: "Contrôle douanier", title: landed.name, status: "Prochain tour perdu", tone: "warning", description: `${active.value?.name ?? "Le joueur actif"} est retenu au contrôle : son prochain tour sera automatiquement passé, puis la partie continuera.` };
});
</script>

<template>
  <section v-if="space && meta" class="landing-notice" :class="[`tone-${meta.tone}`, { compact }]">
    <AssetCard v-if="asset" :asset-id="asset.id" :price="currentPrice" :owner="owner?.name ?? null" compact />
    <div class="landing-notice__body">
      <div class="landing-notice__top"><span class="landing-notice__icon"><GameIcon :name="meta.icon" /></span><span class="landing-notice__status">{{ meta.status }}</span></div>
      <p class="eyebrow">{{ meta.eyebrow }}</p><h2>{{ meta.title }}</h2><p>{{ meta.description }}</p>
    </div>
  </section>
</template>
