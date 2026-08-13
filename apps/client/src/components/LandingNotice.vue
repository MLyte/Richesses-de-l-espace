<script setup lang="ts">
import { computed } from "vue";
import { ASSETS, COUNTRIES, LEVER_CARDS, RESOURCES, TREND_CARDS } from "@richesses-espace/game";
import type { PublicGameView } from "@richesses-espace/protocol";
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
    const title = `${country.value?.name ?? "Monde"} · ${resource.value?.name ?? "Ressource cosmique"}`;
    if (props.game.phase === "WAITING_FOR_PURCHASE") return { icon: "purchase", eyebrow: `${country.value?.continent ?? "Secteur"} · registre`, title, status: "Choix de concessions", tone: "action", description: `Les droits d’extraction de ${resource.value?.name ?? "la ressource"} ont été réglés. ${active.value?.name ?? "Le consortium actif"} peut maintenant acheter jusqu’à six concessions encore disponibles dans le registre de ${country.value?.name ?? "ce monde"}.` };
    if (props.game.phase === "WAITING_FOR_PAYMENT" && props.game.pendingPayment) return { icon: "payment", eyebrow: `${country.value?.name ?? "Monde"} · droits`, title, status: "Paiement requis", tone: "warning", description: `${active.value?.name ?? "Le consortium actif"} doit verser ${props.game.pendingPayment.amount} crédit${props.game.pendingPayment.amount > 1 ? "s" : ""} à ${owner.value?.name ?? "un détenteur"}, qui possède au moins 30 % de ${resource.value?.name ?? "cette ressource"}.` };
    return { icon: "resolved", eyebrow: `${country.value?.continent ?? "Secteur"} · case classique`, title, status: "Deux étapes résolues", tone: "owned", description: `Tous les droits de ${resource.value?.name ?? "la ressource"}, puis les achats dans le registre de ${country.value?.name ?? "ce monde"}, ont été traités.` };
  }
  if (landed.kind === "trend") return { icon: "trend", eyebrow: "Balise cosmique", title: landed.name, status: "Effet appliqué", tone: "trend", description: card.value ? `${card.value.title} — ${card.value.description}` : "Un Événement cosmique a été révélé : le transfert indiqué a été appliqué immédiatement." };
  if (landed.kind === "joker") return props.game.phase === "WAITING_FOR_LEVER_PURCHASE" && props.game.pendingLever ? { icon: "joker", eyebrow: "Station technologique", title: landed.name, status: "Décision requise", tone: "lever", description: `${active.value?.name ?? "Le consortium actif"} peut acheter une Technologie d’évasion pour ${props.game.pendingLever.price} crédits ou passer.` } : { icon: "joker", eyebrow: "Station technologique", title: landed.name, status: card.value ? "Technologie acquise" : (props.game.players.filter((player) => !player.bankrupt && !player.mergedIntoId).length <= 2 ? "Case de repos" : "Offre refusée"), tone: "lever", description: card.value ? `${active.value?.name ?? "Le consortium actif"} acquiert « ${card.value.title} » : ${card.value.description}` : (props.game.players.filter((player) => !player.bankrupt && !player.mergedIntoId).length <= 2 ? "À deux consortiums, les Stations technologiques ne produisent plus aucun effet." : "La Technologie reste disponible dans la pile.") };
  if (landed.kind === "auction") return { icon: "auction", eyebrow: "Marché orbital", title: landed.name, status: props.game.phase === "AUCTION" ? "En cours" : "Résolu", tone: "auction", description: props.game.phase === "AUCTION" ? (props.game.auction?.mode === "selection" ? `${active.value?.name ?? "Le vendeur"} sélectionne le nombre de concessions indiqué par le dé rouge. Les concessions d’une même ressource restent groupées.` : "La mise commence à la moitié exacte du prix d’achat. La fenêtre initiale dure 7 secondes ; une offre tardive garantit 4 secondes pour répondre.") : "Cette case ne s’active qu’après un tour complet et devient une case de repos lorsqu’il ne reste que deux joueurs." };
  if (landed.kind === "dividend") return { icon: "dividend", eyebrow: "Prime d’expédition", title: specialResource.value?.name ?? landed.name, status: props.game.phase === "WAITING_FOR_PAYMENT" ? "Droits à régler" : "Prime reçue", tone: "trend", description: `${active.value?.name ?? "Le consortium actif"} reçoit ${(props.game.lastRoll?.total ?? 0) * .5} crédits (${props.game.lastRoll?.total ?? 0} × 0,5), puis règle les droits de ${specialResource.value?.name ?? "la ressource associée"}.` };
  if (landed.kind === "regional_choice") return { icon: "regional", eyebrow: "Portail sectoriel", title: landed.regionName, status: props.game.phase === "WAITING_FOR_PURCHASE" ? "Choix de concessions" : "Résolu", tone: "action", description: props.game.phase === "WAITING_FOR_PURCHASE" ? `${active.value?.name ?? "Le consortium actif"} peut acheter jusqu’à six concessions dans ces secteurs, uniquement pour des ressources déjà possédées.` : `Secteurs reliés : ${landed.continents.join(", ")}. Aucun registre admissible n’était disponible ou le choix est terminé.` };
  if (landed.kind === "global_choice") return { icon: "global", eyebrow: "Portail galactique", title: landed.name, status: props.game.phase === "WAITING_FOR_PURCHASE" ? "Choix galactique" : "Résolu", tone: "action", description: props.game.phase === "WAITING_FOR_PURCHASE" ? `${active.value?.name ?? "Le consortium actif"} peut compléter jusqu’à six concessions de ressources déjà possédées, partout sur le plateau.` : "Le Portail galactique ne s’active qu’après un tour complet du plateau." };
  return { icon: "customs", eyebrow: "Quarantaine orbitale", title: landed.name, status: "Prochain tour perdu", tone: "warning", description: `${active.value?.name ?? "Le consortium actif"} est placé en quarantaine : son prochain tour sera automatiquement passé.` };
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
