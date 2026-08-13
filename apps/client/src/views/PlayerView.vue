<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ASSETS, COUNTRIES, LEVER_CARDS, RESOURCES, SECTORS, STARTING_CAPITAL, TREND_CARDS } from "@richesses-espace/game";
import { PLAYER_COLORS, PLAYER_SYMBOLS, type BotProfile } from "@richesses-espace/protocol";
import ErrorToast from "../components/ErrorToast.vue";
import { useAccessibleModal } from "../composables/useAccessibleModal";
import { useGameStore } from "../stores/game";
import AssetCard from "../components/AssetCard.vue";
import LandingNotice from "../components/LandingNotice.vue";
import SoundToggle from "../components/SoundToggle.vue";
import HelpOverlay from "../components/HelpOverlay.vue";
import DiceAnimation from "../components/DiceAnimation.vue";
import ResourceInfluenceScore from "../components/ResourceInfluenceScore.vue";
import PlayerTokenIcon from "../components/PlayerTokenIcon.vue";
import GameIcon from "../components/GameIcon.vue";
import MobileRouteMap from "../components/MobileRouteMap.vue";
import { ArrowLeftRight, Bot, Dices, HandCoins, Menu, PackageOpen, Pause, ShoppingCart, Trash2, Users, X } from "@lucide/vue";

const route = useRoute();
const store = useGameStore();
const code = String(route.params.code ?? "").toUpperCase();
const searchParams = new URLSearchParams(window.location.search);
const mobilePreview = import.meta.env.DEV && searchParams.get("preview") === "mobile";
const previewPlayerId = searchParams.get("player") === "orion" ? "orion" : "lyra";
const name = ref("");
const color = ref<string>(PLAYER_COLORS[0]);
const symbol = ref<string>(PLAYER_SYMBOLS[0].id);
const newBotProfile = ref<BotProfile>("BALANCED");
const botProfileLabels: Record<BotProfile, string> = { CAUTIOUS: "Prudent", BALANCED: "Équilibré", AMBITIOUS: "Ambitieux" };
const colorLabels: Record<string, string> = {
  "#e05f42": "Corail",
  "#3784a6": "Bleu spatial",
  "#75a341": "Vert orbital",
  "#e4a72f": "Or solaire",
  "#9666b4": "Violet cosmique",
  "#28a394": "Turquoise"
};
const joining = ref(false);
const tradeOpen = ref(false);
const tradeDialog = ref<HTMLElement | null>(null);
const tradeMode = ref<"purchase" | "sale" | "exchange" | "alliance">("exchange");
const tradeTargetId = ref("");
const offeredResourceId = ref("");
const requestedResourceId = ref("");
const offeredCredits = ref(0);
const requestedCredits = ref(0);
const bidAmount = ref(1);
const auctionSelection = ref<string[]>([]);
const purchaseSelection = ref<string[]>([]);
const portfolioOpen = ref(false);
const portfolioDialog = ref<HTMLElement | null>(null);
const portfolioPage = ref(0);
const turnToast = ref<string | null>(null);
let turnToastTimer = 0;
const { onKeydown: onTradeKeydown } = useAccessibleModal(tradeOpen, tradeDialog, () => { tradeOpen.value = false; });
const { onKeydown: onPortfolioKeydown } = useAccessibleModal(portfolioOpen, portfolioDialog, () => { portfolioOpen.value = false; });

onMounted(async () => {
  if (mobilePreview) {
    store.socket?.disconnect();
    store.socket = null;
    const { createMobilePreviewGame, createMobilePreviewPlayer } = await import("../demo/mobile-preview");
    store.game = createMobilePreviewGame();
    store.player = createMobilePreviewPlayer(previewPlayerId);
    store.role = "player";
    store.sessionToken = null;
    store.connected = true;
    store.error = "";
    store.visualPlayerPositions = Object.fromEntries(store.game.players.map((player) => [player.id, player.position]));
    return;
  }
  void store.resumePlayer(code);
});
const me = computed(() => store.me);
const allowed = (action: string) => store.player?.allowedActions.includes(action as never) ?? false;
const pendingAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.pendingAssetId));
const pendingTitles = computed(() => ASSETS.filter((asset) => store.game?.pendingPurchase?.availableAssetIds.includes(asset.id)));
const pendingCountry = computed(() => COUNTRIES.find((country) => country.id === store.game?.pendingPurchase?.countryId));
const pendingResource = computed(() => RESOURCES.find((resource) => resource.id === store.game?.pendingPurchase?.resourceId));
const purchaseTotal = computed(() => purchaseSelection.value.reduce((total, id) => total + (ASSETS.find((asset) => asset.id === id)?.basePrice ?? 0), 0));
const startingCapital = computed(() => STARTING_CAPITAL[store.game?.players.length ?? 2] ?? 100);
const landedAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.landedAssetId));
const landedOwner = computed(() => store.game?.players.find((player) => player.id === (landedAsset.value ? store.game?.ownership[landedAsset.value.id] : null)) ?? null);
const pausedPlayer = computed(() => store.game?.players.find((player) => player.id === store.game?.pausePlayerId) ?? null);
const myAssets = computed(() => ASSETS.filter((asset) => me.value?.assetIds.includes(asset.id)));
const myResources = computed(() => RESOURCES.filter((resource) => myAssets.value.some((asset) => asset.resourceId === resource.id)));
const resourcesPerPortfolioPage = 3;
const resourcePortfolioPages = computed(() => SECTORS.flatMap((sector) => {
  const resources = myResources.value.filter((resource) => resource.sectorId === sector.id);
  return Array.from({ length: Math.ceil(resources.length / resourcesPerPortfolioPage) }, (_, index) => ({
    sector,
    resources: resources.slice(index * resourcesPerPortfolioPage, index * resourcesPerPortfolioPage + resourcesPerPortfolioPage)
  }));
}));
const portfolioPageCount = computed(() => Math.max(1, resourcePortfolioPages.value.length));
const activePortfolioPage = computed(() => resourcePortfolioPages.value[portfolioPage.value] ?? null);
const visibleResources = computed(() => activePortfolioPage.value?.resources ?? []);
function openPortfolio() { portfolioPage.value = 0; portfolioOpen.value = true; }
const auctionAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.auction?.assetId));
const auctionSeller = computed(() => store.game?.players.find((player) => player.id === store.game?.auction?.sellerId) ?? null);
const auctionLotAssets = computed(() => store.game?.auction?.lots[store.game.auction.currentLotIndex]?.map((id) => ASSETS.find((asset) => asset.id === id)!).filter(Boolean) ?? []);
const auctionMinimum = computed(() => store.game?.auction ? (store.game.auction.currentBid ? Math.round((store.game.auction.currentBid + .1) * 10) / 10 : store.game.auction.minimumBid) : .5);
const leverCards = computed(() => LEVER_CARDS.filter((card) => store.player?.leverIds.includes(card.id)));
const pendingLeverCard = computed(() => LEVER_CARDS.find((card) => card.id === store.player?.pendingLever?.leverId) ?? null);
const tradeTargets = computed(() => store.game?.players.filter((player) => player.id !== me.value?.id && !player.bankrupt && !player.mergedIntoId) ?? []);
const tradeTarget = computed(() => store.game?.players.find((player) => player.id === tradeTargetId.value) ?? null);
const targetResources = computed(() => RESOURCES.filter((resource) => tradeTarget.value?.assetIds.some((assetId) => ASSETS.find((asset) => asset.id === assetId)?.resourceId === resource.id)));
const anyTargetHasResources = computed(() => tradeTargets.value.some((player) => player.assetIds.length));
const isMyTurn = computed(() => store.game?.activePlayerId === me.value?.id);
const isPhoneHost = computed(() => Boolean(store.player?.isHost));
const mobileOnly = computed(() => store.game?.displayMode === "MOBILE_ONLY");
const botThinkingPlayer = computed(() => store.game?.players.find((player) => player.id === store.game?.botThinkingPlayerId) ?? null);
const canHostStart = computed(() => Boolean(isPhoneHost.value && store.game && store.game.players.length >= 2 && store.game.players.every((player) => player.connected && player.ready)));
const hasPrimaryTurnAction = computed(() => allowed("ROLL_DICE") || allowed("END_TURN"));
const hasFixedPrimaryTurnAction = computed(() => allowed("ROLL_DICE") || (!mobileOnly.value && allowed("END_TURN")));
const currentTrade = computed(() => store.game?.tradeOffer ?? null);
const tradeProposer = computed(() => store.game?.players.find((player) => player.id === currentTrade.value?.proposerId) ?? null);
const tradeTargetPlayer = computed(() => store.game?.players.find((player) => player.id === currentTrade.value?.targetId) ?? null);
const lastCard = computed(() => {
  const card = store.game?.lastCard;
  if (!card) return null;
  return card.kind === "trend" ? TREND_CARDS.find((item) => item.id === card.id) : LEVER_CARDS.find((item) => item.id === card.id);
});
const assetName = (id: string | null) => ASSETS.find((asset) => asset.id === id)?.name ?? "aucune concession";
const resourceGroupLabel = (player: typeof me.value, resourceId: string | null) => {
  if (!player || !resourceId) return "Aucune concession";
  const resource = RESOURCES.find((item) => item.id === resourceId);
  const titles = ASSETS.filter((asset) => asset.resourceId === resourceId && player.assetIds.includes(asset.id));
  const share = titles.reduce((total, asset) => total + asset.share, 0);
  return `${resource?.name ?? "Ressource"} · ${titles.length} concession${titles.length > 1 ? "s" : ""} · ${share} %`;
};
const canUseLever = (kind: string) => kind === "payment_shield" ? store.game?.phase === "WAITING_FOR_PAYMENT" : kind === "purchase_discount" ? store.game?.phase === "WAITING_FOR_PURCHASE" : kind === "auction_exemption" ? store.game?.phase === "AUCTION" && store.game.auction?.mode === "selection" && store.game.auction.sellerId === me.value?.id : ["WAITING_FOR_ROLL", "WAITING_FOR_END_TURN"].includes(store.game?.phase ?? "");
const payment = computed(() => store.game?.pendingPayment ?? null);
const paymentPayer = computed(() => store.game?.players.find((player) => player.id === payment.value?.payerId) ?? null);
const paymentRecipient = computed(() => store.game?.players.find((player) => player.id === payment.value?.recipientId) ?? null);
const personalMoneyNotice = computed(() => {
  const event = store.animatedEvent;
  if (!event || !me.value || !["payment_due", "payment_completed"].includes(event.type)) return null;
  return event.data?.payerId === me.value.id || event.data?.recipientId === me.value.id ? event.message : null;
});
const mobileLiveNotice = computed(() => store.animatedEvent?.message ?? turnToast.value);
watch(() => store.game?.auction?.mode === "selection" ? `${store.game.turnNumber}:${store.game.auction.sellerId}:${store.game.landedSpaceId}` : null, () => { auctionSelection.value = []; });
watch(() => store.game?.pendingPurchase ? `${store.game.turnNumber}:${store.game.landedSpaceId}` : null, () => { purchaseSelection.value = []; });
watch(() => store.game ? `${store.game.turnNumber}:${store.game.activePlayerId}:${store.game.phase}:${store.player?.allowedActions.join("|") ?? ""}` : null, () => {
  window.clearTimeout(turnToastTimer);
  if (!mobileOnly.value || !store.activePlayer) { turnToast.value = null; return; }
  turnToast.value = isMyTurn.value ? "À vous de jouer" : `Tour de ${store.activePlayer.name}`;
  turnToastTimer = window.setTimeout(() => { turnToast.value = null; }, 2800);
}, { immediate: true });
watch(() => store.animatedEvent?.id ?? null, (eventId) => {
  if (!eventId) return;
  window.clearTimeout(turnToastTimer);
  turnToast.value = null;
});
onBeforeUnmount(() => window.clearTimeout(turnToastTimer));

async function run(action: () => Promise<unknown>) {
  if (mobilePreview) {
    store.error = "Aperçu solo : les commandes réseau sont désactivées, mais la carte et le portefeuille restent interactifs.";
    return;
  }
  try { await action(); } catch { /* affiché */ }
}
function addBot() { return run(() => store.addBot(newBotProfile.value)); }
function updateBot(playerId: string, event: Event) { return run(() => store.updateBot(playerId, (event.target as HTMLSelectElement).value as BotProfile)); }
function removeBot(playerId: string) { return run(() => store.removeBot(playerId)); }
async function join() {
  joining.value = true;
  try { await store.join(code, name.value, color.value, symbol.value); } catch { /* affiché */ }
  finally { joining.value = false; }
}
function openTrade(mode: "purchase" | "sale" | "exchange" | "alliance") {
  tradeMode.value = mode;
  tradeTargetId.value = tradeTargets.value[0]?.id ?? "";
  offeredResourceId.value = mode === "sale" || mode === "exchange" ? myResources.value[0]?.id ?? "" : "";
  requestedResourceId.value = mode === "purchase" || mode === "exchange" ? targetResources.value[0]?.id ?? "" : "";
  offeredCredits.value = mode === "purchase" ? 1 : 0;
  requestedCredits.value = mode === "sale" ? 1 : 0;
  tradeOpen.value = true;
}
function resetRequestedResource() {
  requestedResourceId.value = tradeMode.value === "purchase" || tradeMode.value === "exchange" ? targetResources.value[0]?.id ?? "" : "";
}
async function submitTrade() {
  await run(() => store.proposeTrade({ targetId: tradeTargetId.value, kind: tradeMode.value === "alliance" ? "alliance" : "trade", offeredResourceId: tradeMode.value === "alliance" ? null : offeredResourceId.value || null, requestedResourceId: tradeMode.value === "alliance" ? null : requestedResourceId.value || null, offeredCredits: tradeMode.value === "alliance" ? 0 : Number(offeredCredits.value), requestedCredits: tradeMode.value === "alliance" ? 0 : Number(requestedCredits.value) }));
  if (!store.error) tradeOpen.value = false;
}
function placeCurrentBid() { return store.bid(Math.max(auctionMinimum.value, Number(bidAmount.value))); }
async function shareInvitation() {
  const url = store.game?.joinUrls[0] ?? window.location.href;
  const data = { title: "Rejoindre Richesses de l’espace", text: `Rejoins l’expédition ${code}`, url };
  if (navigator.share) await navigator.share(data);
  else {
    await navigator.clipboard.writeText(url);
    store.error = "Lien d’invitation copié.";
  }
}
async function finishAsHost() {
  if (window.confirm("Terminer la partie pour tous les joueurs ?")) await run(store.finish);
}
</script>

<template>
  <main class="phone-shell">
    <header class="phone-header">
      <div class="brand compact"><span class="brand-mark"><GameIcon name="reward" /></span><span>RICHESSES DE L’ESPACE</span></div>
      <div class="phone-tools">
        <button v-if="mobileOnly && store.game?.phase !== 'LOBBY' && me" type="button" class="phone-resource-button" @click="openPortfolio">
          <PackageOpen :size="19" aria-hidden="true" /><span>Ressources</span><b>{{ myAssets.length }}</b>
        </button>
        <details v-if="isPhoneHost && store.game?.phase !== 'LOBBY'" class="mobile-host-menu">
          <summary aria-label="Commandes de l’hôte"><Menu :size="18" aria-hidden="true" /></summary>
          <div>
            <span class="mobile-host-menu__label">Commandes de l’hôte</span>
            <button v-if="store.game?.phase === 'PAUSED'" type="button" @click="run(store.resumeGame)">Reprendre</button>
            <button v-else-if="store.game?.phase !== 'FINISHED'" type="button" @click="run(store.pause)">Mettre en pause</button>
            <button v-if="store.game?.phase === 'FINISHED'" type="button" @click="run(store.restart)">{{ store.localGame ? 'Rejouer contre Orion' : 'Rejouer avec le groupe' }}</button>
            <button v-else type="button" class="danger" @click="finishAsHost">Terminer</button>
          </div>
        </details>
        <HelpOverlay /><SoundToggle /><span class="connection-dot" :class="{ online: store.connected }" role="status" :aria-label="store.connected ? 'Connexion au serveur active' : 'Connexion au serveur interrompue'" />
      </div>
    </header>
    <p v-if="store.game" class="sr-only" role="status" aria-live="polite">Ronde {{ store.game.roundNumber }}. Tour de {{ store.activePlayer?.name }}. {{ botThinkingPlayer ? `${botThinkingPlayer.name} réfléchit.` : isMyTurn ? 'Une action vous attend.' : 'Suivez la progression de la flotte.' }}</p>
    <Transition name="event"><div v-if="mobileOnly && mobileLiveNotice" :key="mobileLiveNotice" class="mobile-live-toast" role="status" aria-live="polite">{{ mobileLiveNotice }}</div></Transition>

    <section v-if="!store.player" class="join-screen">
      <p class="eyebrow">Expédition {{ code }}</p>
      <h1>Embarquez pour<br><em>l’expédition.</em></h1>
      <form class="join-form" @submit.prevent="join">
        <label>Votre prénom<input v-model="name" maxlength="20" autocomplete="name" placeholder="Mathieu" required /></label>
        <fieldset><legend>Votre couleur</legend><div class="color-picker"><button v-for="choice in PLAYER_COLORS" :key="choice" type="button" :aria-label="colorLabels[choice]" :aria-pressed="color === choice" :class="{ selected: color === choice }" :style="{ '--choice': choice }" @click="color = choice" /></div></fieldset>
        <fieldset><legend>Votre animal</legend><div class="symbol-picker"><button v-for="choice in PLAYER_SYMBOLS" :key="choice.id" type="button" :title="choice.label" :aria-label="choice.label" :aria-pressed="symbol === choice.id" :class="{ selected: symbol === choice.id }" @click="symbol = choice.id"><PlayerTokenIcon :symbol="choice.id" /></button></div></fieldset>
        <button class="primary-button" :disabled="joining || !name.trim()">Rejoindre la flotte</button>
      </form>
    </section>

    <template v-else-if="store.game && me">
      <section v-if="store.game.phase === 'LOBBY'" class="phone-lobby">
        <p class="eyebrow">Expédition {{ store.game.code }}</p><h1>Bienvenue à bord,<br><em>{{ me.name }}.</em></h1>
        <div class="identity-card"><i class="player-token" :style="{ background: me.color }"><PlayerTokenIcon :symbol="me.symbol" /></i><div><span>Capital au lancement</span><b>{{ startingCapital }} crédits</b></div></div>
        <button class="primary-button" :class="{ confirmed: me.ready }" :disabled="store.pending" @click="run(() => store.setReady(!me!.ready))">{{ me.ready ? 'Prêt·e — modifier' : 'Je suis prêt·e' }}</button>
        <p class="waiting-copy">{{ me.ready ? 'La partie commencera dès que tout l’équipage sera prêt.' : 'Confirmez quand votre poste est prêt.' }}</p>
        <div v-if="isPhoneHost" class="mobile-host-lobby">
          <section class="bot-lobby-controls" aria-labelledby="bot-controls-title">
            <div><Bot :size="20" aria-hidden="true" /><span><strong id="bot-controls-title">Joueurs robots</strong><small>Ajoutez un adversaire autonome.</small></span></div>
            <label>Profil
              <select v-model="newBotProfile" :disabled="store.pending || store.game.players.length >= 6">
                <option v-for="(label, profile) in botProfileLabels" :key="profile" :value="profile">{{ label }}</option>
              </select>
            </label>
            <button type="button" class="secondary-button" :disabled="store.pending || store.game.players.length >= 6" @click="addBot"><Bot :size="18" aria-hidden="true" />{{ store.game.players.length >= 6 ? 'Table complète' : 'Ajouter un robot' }}</button>
          </section>
          <button type="button" class="secondary-button" @click="shareInvitation">Partager le lien · {{ store.game.code }}</button>
          <button type="button" class="primary-button" :disabled="!canHostStart || store.pending" @click="run(store.startGame)">Lancer la partie</button>
          <small v-if="!canHostStart">Deux joueurs connectés et prêts sont nécessaires.</small>
        </div>
        <div class="mini-roster lobby-player-list">
          <article v-for="player in store.game.players" :key="player.id" :class="{ 'is-bot': player.isBot }">
            <i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>
            <span><strong>{{ player.name }}</strong><small v-if="player.isBot"><Bot :size="12" aria-hidden="true" /> Robot · {{ botProfileLabels[player.botProfile!] }}</small><small v-else>{{ player.ready ? 'Prêt·e' : 'Se prépare' }}</small></span>
            <div v-if="isPhoneHost && player.isBot" class="bot-row-actions">
              <select :value="player.botProfile ?? 'BALANCED'" :aria-label="`Profil de ${player.name}`" :disabled="store.pending" @change="updateBot(player.id, $event)">
                <option v-for="(label, profile) in botProfileLabels" :key="profile" :value="profile">{{ label }}</option>
              </select>
              <button type="button" :aria-label="`Retirer ${player.name}`" :disabled="store.pending" @click="removeBot(player.id)"><Trash2 :size="16" aria-hidden="true" /></button>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="controller-screen" :class="{ 'controller-screen--mobile-only': mobileOnly, 'controller-screen--map': mobileOnly }">
        <DiceAnimation v-if="store.diceAnimation && store.diceAnimation.playerId === me.id" class="dice-animation-phone" :dice="store.diceAnimation.dice" :total="store.diceAnimation.total" :rolling="store.diceAnimation.rolling" compact />
        <Transition name="event"><div v-if="personalMoneyNotice" class="personal-money-notice">{{ personalMoneyNotice }}</div></Transition>
        <div class="controller-meta"><div><span>Ronde {{ store.game.roundNumber }}</span><b>{{ me.name }}</b></div><div class="capital"><span>Capital</span><b>{{ me.capital }}</b></div></div>
        <div v-if="botThinkingPlayer" class="bot-thinking" role="status"><Bot :size="18" aria-hidden="true" /><span><strong>{{ botThinkingPlayer.name }}</strong> réfléchit…</span></div>
        <section v-if="mobileOnly" class="mobile-map-panel mobile-map-panel--route" aria-label="Carte de la partie">
          <MobileRouteMap :board="store.game.board" :players="store.game.players" :active-player-id="store.game.activePlayerId" :current-player-id="me.id" :turn-number="store.game.turnNumber" :ownership="store.game.ownership" :visual-positions="store.visualPlayerPositions" />
        </section>
        <div v-if="store.game.phase === 'PAUSED'" class="state-message pause-phone mobile-map-overlay"><span class="pause-phone__icon" aria-label="Partie en pause"><Pause :size="25" aria-hidden="true" /></span><h2>{{ store.game.pauseReason === 'PLAYER_DISCONNECTED' ? (pausedPlayer?.connected ? 'Connexion rétablie' : 'Connexion interrompue') : 'Pause de l’hôte' }}</h2><p v-if="pausedPlayer && !pausedPlayer.connected"><strong>{{ pausedPlayer.name }}</strong> a perdu la connexion. La partie est gelée jusqu’à son retour, sans modifier les soldes ni le tour.</p><p v-else-if="pausedPlayer"><strong>{{ pausedPlayer.name }}</strong> est revenu·e. L’hôte peut maintenant reprendre la partie depuis son téléphone.</p><p v-else>L’hôte a suspendu la partie. Gardez cette page ouverte : la reprise apparaîtra automatiquement.</p></div>
        <div v-else-if="store.game.phase === 'FINISHED'" class="state-message final-phone mobile-map-overlay"><p class="eyebrow">Partie terminée</p><h2>{{ store.game.finishReason === 'ADMIN' ? 'La partie a été arrêtée par l’hôte.' : store.game.winnerId === me.id ? 'Votre consortium reste seul en activité !' : `${store.game.players.find(player => player.id === store.game?.winnerId)?.name ?? 'La table'} remporte la partie.` }}</h2><p>Votre flotte termine avec {{ me.capital }} crédits stellaires et {{ me.assetIds.length }} concession(s).</p></div>
        <div v-else-if="me.bankrupt" class="state-message bankruptcy-state mobile-map-overlay"><p class="eyebrow">Faillite déclarée</p><h2>Vous quittez la partie.</h2><p>Vous restez spectateur jusqu’au classement final.</p></div>
        <div v-else-if="currentTrade" class="trade-response mobile-map-overlay">
          <p class="eyebrow">{{ currentTrade.kind === 'alliance' ? 'Consortium conjoint proposé' : 'Transaction entre joueurs' }}</p><h2>{{ tradeProposer?.name }} propose un accord à {{ tradeTargetPlayer?.name }}.</h2>
          <p v-if="currentTrade.kind === 'alliance'">Les portefeuilles seront réunis sous le pion le plus précieux. Chaque associé versera <strong>{{ currentTrade.allianceTax }} crédits</strong> à la Banque interstellaire.</p>
          <div v-else class="trade-summary"><div><span>{{ tradeProposer?.name }} cède</span><b>{{ resourceGroupLabel(tradeProposer, currentTrade.offeredResourceId) }}</b><small v-if="currentTrade.offeredCredits">+ {{ currentTrade.offeredCredits }} crédit(s)</small></div><div><span>{{ tradeTargetPlayer?.name }} cède</span><b>{{ resourceGroupLabel(tradeTargetPlayer, currentTrade.requestedResourceId) }}</b><small v-if="currentTrade.requestedCredits">+ {{ currentTrade.requestedCredits }} crédit(s)</small></div></div>
          <div v-if="allowed('ACCEPT_TRADE')" class="action-row"><button class="secondary-button" @click="run(store.rejectTrade)">Refuser</button><button class="primary-button" @click="run(store.acceptTrade)">{{ currentTrade.kind === 'alliance' ? 'Former le consortium' : 'Accepter l’échange' }}</button></div>
          <button v-else-if="allowed('REJECT_TRADE')" class="secondary-button wide-button" @click="run(store.rejectTrade)">Retirer mon offre</button>
          <p v-else class="waiting-copy">La réponse est attendue sur le téléphone de {{ tradeTargetPlayer?.name }}.</p>
        </div>
        <div v-else-if="store.game.auction && auctionAsset" class="auction-phone mobile-map-overlay">
          <template v-if="store.game.auction.mode === 'selection'">
            <p class="eyebrow">Marché orbital · dé rouge {{ store.game.auction.redDie }}</p><h2>{{ auctionSeller?.name }} doit sélectionner {{ store.game.auction.targetCount }} concession{{ store.game.auction.targetCount > 1 ? 's' : '' }}.</h2>
            <div v-if="allowed('SELECT_AUCTION_ASSETS')" class="auction-selection"><label v-for="assetId in me.assetIds" :key="assetId" :class="{ selected: auctionSelection.includes(assetId) }"><input v-model="auctionSelection" type="checkbox" :value="assetId" /><span>{{ assetName(assetId) }}</span><b>{{ ASSETS.find(asset => asset.id === assetId)?.purchasePrice }}&nbsp;cr.</b></label><button class="primary-button wide-button" :disabled="!auctionSelection.length || store.pending" @click="run(() => store.selectAuctionAssets(auctionSelection))">Confirmer les lots</button><p>Les concessions d’une même ressource sont vendues ensemble. Si vous ne possédez que de grands portefeuilles, le groupe choisi reste entier même s’il dépasse le dé rouge.</p></div>
            <p v-else class="waiting-copy">La sélection des concessions est en cours sur le téléphone de {{ auctionSeller?.name }}.</p>
          </template>
          <template v-else>
            <p class="eyebrow">{{ store.game.auction.bankSale ? 'Faillite · vente par la banque' : 'Appel d’offres' }} · lot {{ store.game.auction.currentLotIndex + 1 }}/{{ store.game.auction.lots.length }}</p><h2>{{ auctionLotAssets.map(asset => asset.name).join(' + ') }}</h2><AssetCard :asset-id="auctionAsset.id" compact />
            <p class="auction-seller">{{ store.game.auction.bankSale ? `Concessions de ${auctionSeller?.name} remises aux registres` : `Vendeur : ${auctionSeller?.name}` }} · prix initial à 50 %</p>
            <div class="auction-current"><span>Meilleure offre</span><b>{{ store.game.auction.currentBid || store.game.auction.minimumBid }}</b><small>{{ store.game.players.find(player => player.id === store.game?.auction?.leaderId)?.name ?? 'Prix de départ' }}</small></div>
            <div v-if="allowed('BID')" class="bid-controls"><label>Votre offre<input v-model.number="bidAmount" type="number" step="0.1" :min="auctionMinimum" :max="me.capital" /></label><div class="action-row"><button class="secondary-button" @click="run(store.passBid)">Passer</button><button class="primary-button" :disabled="me.capital < auctionMinimum" @click="run(placeCurrentBid)">Enchérir</button></div><p>Pas minimum : 0,1 crédit. Le lot est adjugé après 10 secondes sans nouvelle offre.</p></div>
            <p v-else class="waiting-copy">{{ store.game.auction.sellerId === me.id ? 'Vous êtes le vendeur et recevrez le prix final.' : store.game.auction.leaderId === me.id ? 'Votre offre est en tête.' : 'Vous avez quitté cet appel d’offres.' }}</p>
          </template>
        </div>
        <div v-else-if="payment && me.id === payment.recipientId && !mobileOnly" class="payment-receiver-state"><AssetCard v-if="landedAsset" :asset-id="landedAsset.id" :owner="me.name" compact /><div class="state-message"><span class="waiting-pulse" /><p class="eyebrow">Droit attendu</p><h2>{{ paymentPayer?.name }} vous doit {{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }}.</h2><p>Vous serez crédité dès que le transfert sera confirmé sur son téléphone.</p></div></div>
        <div v-else-if="pendingLeverCard && (allowed('BUY_LEVER') || allowed('PASS_LEVER'))" class="lever-purchase-action mobile-map-overlay"><p class="eyebrow">Station technologique</p><div class="joker-card"><span>TECHNOLOGIE</span><h2>{{ pendingLeverCard.title }}</h2><p>{{ pendingLeverCard.description }}</p><b>{{ store.player?.pendingLever?.price }} crédits</b></div><div class="action-row"><button class="secondary-button" :disabled="store.pending" @click="run(store.passLever)">Passer</button><button class="primary-button" :disabled="store.pending || me.capital < (store.player?.pendingLever?.price ?? 0)" @click="run(store.buyLever)">Acquérir</button></div></div>
        <div v-else-if="!mobileOnly && !allowed('ROLL_DICE') && !allowed('BUY_ASSET') && !allowed('PASS_ASSET') && !allowed('PAY_RETURNS') && !allowed('END_TURN')" class="spectator-state"><div class="state-message"><span class="waiting-pulse" /><h2>Tour de {{ store.activePlayer?.name }}</h2><p>Suivez les mouvements sur l’écran commun.</p></div><LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact /></div>
        <div v-else-if="allowed('ROLL_DICE')" class="primary-action action-card action-card--roll mobile-map-overlay"><p class="eyebrow">À vous de jouer</p><h1>Faites avancer l’expédition.</h1><button class="dice-button" :disabled="store.pending" @click="run(store.roll)"><Dices :size="28" aria-hidden="true" />Lancer les dés</button></div>
        <div v-else-if="pendingAsset && allowed('BUY_ASSET')" class="purchase-action country-purchase mobile-map-overlay">
          <p class="eyebrow">{{ store.game.pendingPurchase?.source === 'classic' ? `${pendingCountry?.continent} · ${pendingCountry?.name}` : store.game.pendingPurchase?.source === 'regional' ? 'Portail sectoriel' : 'Portail galactique' }}</p>
          <h2>{{ store.game.pendingPurchase?.source === 'classic' ? `Choisissez jusqu’à ${store.game.pendingPurchase?.maxAssets} concessions du monde` : store.game.pendingPurchase?.label }}</h2>
          <p v-if="store.game.pendingPurchase?.source === 'classic'">Après ce choix, les droits de <strong>{{ pendingResource?.name }}</strong> seront calculés pour tous les détenteurs atteignant 30 %.</p>
          <p v-else>Choisissez jusqu’à six concessions parmi les ressources que vous possédez déjà. Ce choix ne déclenche aucun droit.</p>
          <div class="auction-selection title-selection"><label v-for="title in pendingTitles" :key="title.id" :class="{ selected: purchaseSelection.includes(title.id) }"><input v-model="purchaseSelection" type="checkbox" :value="title.id" :disabled="!purchaseSelection.includes(title.id) && purchaseSelection.length >= (store.game.pendingPurchase?.maxAssets ?? 6)" /><span class="title-selection__copy"><strong>{{ title.name }}</strong><small>{{ title.share }}&nbsp;%</small></span><b>{{ title.basePrice }}&nbsp;cr.</b></label></div>
          <div class="purchase-total"><span>{{ purchaseSelection.length }}&nbsp;concession(s)</span><b>{{ purchaseTotal }}&nbsp;crédits</b></div>
          <div class="action-row"><button class="secondary-button" :disabled="store.pending" @click="run(store.pass)">Ne rien acheter</button><button class="primary-button" :disabled="store.pending || !purchaseSelection.length || me.capital < purchaseTotal" @click="run(() => store.buy(purchaseSelection))">Acheter la sélection</button></div>
        </div>
        <div v-else-if="payment && (allowed('PAY_RETURNS') || allowed('DECLARE_BANKRUPTCY'))" class="payment-action mobile-map-overlay">
          <AssetCard :asset-id="payment.assetId" :owner="paymentRecipient?.name ?? null" />
          <div class="payment-summary"><p class="eyebrow">Droit d’extraction obligatoire</p><h2>{{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }} à verser</h2><p v-if="allowed('DECLARE_BANKRUPTCY')">Vos liquidités sont insuffisantes. Vous pouvez d’abord vendre un portefeuille complet via « Vendre ». Sinon, la Banque interstellaire couvrira la dette et vos concessions retourneront aux registres.</p><p v-else>Ce droit rémunère {{ paymentRecipient?.name }}. Le tour ne peut pas se terminer avant votre confirmation.</p><button v-if="allowed('PAY_RETURNS')" class="primary-button payment-button" :disabled="store.pending" @click="run(store.payReturns)">Payer {{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }}</button><button v-if="allowed('DECLARE_BANKRUPTCY')" class="bankruptcy-button" @click="run(store.declareBankruptcy)">Perdre la licence</button></div>
        </div>
        <div v-else-if="allowed('END_TURN')" class="end-turn-action mobile-map-overlay"><LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact /><div><p class="eyebrow">Case résolue</p><h2>Vous avez pris connaissance de son effet.</h2><button class="primary-button" :disabled="store.pending" @click="run(store.endTurn)">Terminer le tour</button></div></div>

        <aside v-if="!mobileOnly && allowed('PROPOSE_TRADE') && tradeTargets.length" class="title-actions" :class="{ 'title-actions--with-primary': hasFixedPrimaryTurnAction }" aria-label="Transferts de concessions">
          <p v-if="isMyTurn && me.capital === 0">Plus de liquidités : vous pouvez vendre un groupe complet avant de lancer les dés ou de terminer votre tour.</p>
          <div class="title-actions__grid-four">
            <button v-if="isMyTurn" type="button" :disabled="!anyTargetHasResources || me.capital <= 0" @click="openTrade('purchase')"><ShoppingCart :size="20" aria-hidden="true" /><span>Acheter</span></button>
            <button v-if="isMyTurn" type="button" class="title-actions__sale" :disabled="!myResources.length" @click="openTrade('sale')"><HandCoins :size="20" aria-hidden="true" /><span>Vendre</span></button>
            <button type="button" :disabled="!myResources.length || !anyTargetHasResources" @click="openTrade('exchange')"><ArrowLeftRight :size="20" aria-hidden="true" /><span>Échanger</span></button>
            <button v-if="!me.allianceId" type="button" @click="openTrade('alliance')"><Users :size="20" aria-hidden="true" /><span>S’allier</span></button>
          </div>
        </aside>

        <div v-if="lastCard" class="drawn-card"><p class="eyebrow">{{ store.game.lastCard?.kind === 'trend' ? 'Événement révélé' : 'Technologie obtenue' }}</p><h3>{{ lastCard.title }}</h3><p>{{ lastCard.description }}</p></div>
        <section v-if="leverCards.length && !mobileOnly" class="lever-hand"><div class="section-title"><span>Vos technologies</span><b>{{ leverCards.length }}</b></div><article v-for="lever in leverCards" :key="lever.id"><div><strong>{{ lever.title }}</strong><p>{{ lever.description }}</p></div><button :disabled="!canUseLever(lever.kind) || store.pending" @click="run(() => store.useLever(lever.id))">Activer</button></article></section>
        <button v-if="!mobileOnly" class="portfolio-fab" :class="{ 'portfolio-fab--with-trades': allowed('PROPOSE_TRADE') && tradeTargets.length, 'portfolio-fab--with-primary': hasPrimaryTurnAction }" type="button" @click="openPortfolio"><PackageOpen :size="20" aria-hidden="true" /><span>Ressources</span><b>{{ myAssets.length }}</b></button>
        <Teleport to="body">
          <div v-if="portfolioOpen" class="portfolio-backdrop" @click.self="portfolioOpen = false">
            <section ref="portfolioDialog" class="portfolio-drawer" role="dialog" aria-modal="true" aria-labelledby="portfolio-title" tabindex="-1" @keydown="onPortfolioKeydown">
              <header><div class="section-title section-title--portfolio"><span>Type de ressources</span><b id="portfolio-title" :style="{ color: activePortfolioPage?.sector.color }">{{ activePortfolioPage?.sector.name ?? 'Vos ressources' }}</b><small>{{ myAssets.length }} concession{{ myAssets.length > 1 ? 's' : '' }} · {{ me.capital }}&nbsp;crédits</small></div></header>
              <div v-if="!myAssets.length" class="empty-portfolio">Vos futures parts apparaîtront ici.</div>
              <div v-else class="resource-score-list resource-score-list--drawer"><ResourceInfluenceScore v-for="resource in visibleResources" :key="resource.id" :resource-id="resource.id" :asset-ids="me.assetIds" /></div>
              <footer v-if="portfolioPageCount > 1" class="portfolio-pager"><button type="button" :disabled="portfolioPage === 0" @click="portfolioPage -= 1">Précédent</button><span>{{ portfolioPage + 1 }} / {{ portfolioPageCount }}</span><button type="button" :disabled="portfolioPage + 1 >= portfolioPageCount" @click="portfolioPage += 1">Suivant</button></footer>
              <section v-if="mobileOnly && leverCards.length" class="lever-hand lever-hand--portfolio"><div class="section-title"><span>Vos technologies</span><b>{{ leverCards.length }}</b></div><article v-for="lever in leverCards" :key="lever.id"><div><strong>{{ lever.title }}</strong><p>{{ lever.description }}</p></div><button :disabled="!canUseLever(lever.kind) || store.pending" @click="run(() => store.useLever(lever.id))">Activer</button></article></section>
              <aside v-if="mobileOnly && allowed('PROPOSE_TRADE') && tradeTargets.length" class="portfolio-actions" aria-label="Transferts de concessions">
                <span>Transactions</span>
                <div class="title-actions__grid-four">
                  <button v-if="isMyTurn" type="button" :disabled="!anyTargetHasResources || me.capital <= 0" @click="openTrade('purchase')"><ShoppingCart :size="20" aria-hidden="true" /><span>Acheter</span></button>
                  <button v-if="isMyTurn" type="button" :disabled="!myResources.length" @click="openTrade('sale')"><HandCoins :size="20" aria-hidden="true" /><span>Vendre</span></button>
                  <button type="button" :disabled="!myResources.length || !anyTargetHasResources" @click="openTrade('exchange')"><ArrowLeftRight :size="20" aria-hidden="true" /><span>Échanger</span></button>
                  <button v-if="!me.allianceId" type="button" @click="openTrade('alliance')"><Users :size="20" aria-hidden="true" /><span>S’allier</span></button>
                </div>
              </aside>
              <button class="portfolio-close" type="button" @click="portfolioOpen = false"><X :size="20" aria-hidden="true" /><span>Fermer</span></button>
            </section>
          </div>
        </Teleport>
        <div v-if="tradeOpen" class="trade-backdrop" @click.self="tradeOpen = false">
          <form ref="tradeDialog" class="trade-form" role="dialog" aria-modal="true" aria-labelledby="trade-dialog-title" tabindex="-1" @keydown="onTradeKeydown" @submit.prevent="submitTrade">
            <button type="button" class="help-close" aria-label="Fermer la proposition" @click="tradeOpen = false">×</button>
            <p class="eyebrow">{{ tradeMode === 'sale' ? 'Vente de concessions' : tradeMode === 'purchase' ? 'Achat entre consortiums' : tradeMode === 'alliance' ? 'Consortium conjoint' : 'Échange de ressources' }}</p>
            <h2 id="trade-dialog-title">{{ tradeMode === 'sale' ? 'Vendre un groupe complet' : tradeMode === 'purchase' ? 'Faire une offre d’achat' : tradeMode === 'alliance' ? 'Unir vos portefeuilles et votre pion' : 'Échanger deux groupes complets' }}</h2>
            <p class="trade-rule-note">{{ tradeMode === 'alliance' ? 'Chaque associé paie à la Banque interstellaire la moitié du prix d’achat cumulé de toutes les concessions. Le pion du portefeuille le plus précieux devient le pion pilote.' : 'Toutes les concessions de la ressource choisie sont incluses dans l’accord, quel que soit leur monde d’origine.' }}</p>
            <label>Partenaire<select v-model="tradeTargetId" @change="resetRequestedResource"><option v-for="player in tradeTargets" :key="player.id" :value="player.id">{{ player.name }}</option></select></label>
            <div v-if="tradeMode !== 'alliance'" class="trade-form-grid">
              <fieldset><legend>Vous cédez</legend><label v-if="tradeMode !== 'purchase'">Portefeuille de ressource<select v-model="offeredResourceId" required><option v-for="resource in myResources" :key="resource.id" :value="resource.id">{{ resourceGroupLabel(me, resource.id) }}</option></select></label><p v-else class="trade-empty-side">Aucune concession</p><label v-if="tradeMode !== 'sale'">Crédits<input v-model.number="offeredCredits" type="number" min="0" step="0.1" :max="me.capital" /></label></fieldset>
              <fieldset><legend>{{ tradeTarget?.name }} cède</legend><label v-if="tradeMode !== 'sale'">Portefeuille de ressource<select v-model="requestedResourceId" required><option v-for="resource in targetResources" :key="resource.id" :value="resource.id">{{ resourceGroupLabel(tradeTarget, resource.id) }}</option></select></label><p v-else class="trade-empty-side">Aucune concession</p><label v-if="tradeMode !== 'purchase'">Crédits<input v-model.number="requestedCredits" type="number" :min="tradeMode === 'sale' ? 0.1 : 0" step="0.1" :max="tradeTarget?.capital ?? 0" :required="tradeMode === 'sale'" /></label></fieldset>
            </div>
            <button class="primary-button wide-button" :disabled="store.pending">{{ tradeMode === 'alliance' ? 'Proposer le consortium' : 'Envoyer l’offre' }}</button>
          </form>
        </div>
      </section>
    </template>
    <section v-else class="loading-state"><span class="spinner" /><p>Connexion au relais spatial…</p></section>
    <ErrorToast v-if="store.error" :message="store.error" @dismiss="store.error = ''" />
  </main>
</template>

<style scoped>
.mobile-host-menu { position: relative; }
.mobile-host-menu summary { display: grid; place-items: center; width: 36px; height: 36px; color: #f3f8fc; border: 1px solid rgba(66, 202, 229, .5); border-radius: 50%; background: rgba(16, 42, 67, .96); cursor: pointer; list-style: none; }
.mobile-host-menu summary::-webkit-details-marker { display: none; }
.mobile-host-menu > div { position: absolute; z-index: 80; top: calc(100% + .55rem); right: 0; display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; width: min(248px, calc(100vw - 2rem)); padding: .7rem; color: #f3f8fc; border: 1px solid rgba(66, 202, 229, .48); border-radius: 14px; background: #102a43; box-shadow: 0 16px 38px rgba(0, 0, 0, .34); }
.mobile-host-menu__label { grid-column: 1 / -1; color: #9ec2d8; font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.mobile-host-menu button { min-height: 44px; padding: .55rem; color: #f3f8fc; border: 1px solid rgba(169, 189, 208, .4); border-radius: 10px; background: #15344d; font: inherit; font-size: .75rem; font-weight: 800; }
.mobile-host-menu button.danger { color: #fff; border-color: rgba(242, 103, 74, .75); background: #9d3e35; }
.mobile-host-lobby { display: grid; gap: .75rem; margin: 1rem 0; }
.mobile-host-lobby small { text-align: center; color: #52687a; }
.bot-lobby-controls { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; padding: .8rem; border: 1px solid rgba(53, 208, 226, .35); border-radius: 14px; background: rgba(53, 208, 226, .08); text-align: left; }
.bot-lobby-controls > div { grid-column: 1 / -1; display: flex; align-items: center; gap: .55rem; }
.bot-lobby-controls > div span, .bot-lobby-controls > div strong, .bot-lobby-controls > div small { display: block; }
.bot-lobby-controls > div small { margin-top: .12rem; text-align: left; }
.bot-lobby-controls label { display: grid; gap: .25rem; color: #9ec2d8; font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.bot-lobby-controls select, .bot-row-actions select { min-height: 44px; padding: .5rem .65rem; color: #f3f8fc; border: 1px solid rgba(169, 189, 208, .45); border-radius: 9px; background: #102a43; font: inherit; }
.bot-lobby-controls > button { display: flex; align-items: center; justify-content: center; gap: .4rem; min-height: 44px; align-self: end; }
.lobby-player-list { display: grid; gap: .55rem; margin-top: 1rem; }
.lobby-player-list article { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: center; gap: .55rem; padding: .6rem .7rem; border: 1px solid rgba(114, 169, 194, .28); border-radius: 11px; background: rgba(16, 42, 67, .75); text-align: left; }
.lobby-player-list article > span, .lobby-player-list article strong, .lobby-player-list article small { display: block; min-width: 0; }
.lobby-player-list article strong { color: #f3f8fc; font-size: .78rem; }
.lobby-player-list article small { margin-top: .15rem; color: #9ec2d8; font-size: .62rem; }
.lobby-player-list article small svg { display: inline-block; margin-right: .2rem; vertical-align: -2px; }
.bot-row-actions { display: flex; align-items: center; gap: .35rem; }
.bot-row-actions select { min-height: 36px; max-width: 112px; padding: .3rem .45rem; font-size: .68rem; }
.bot-row-actions button { display: grid; place-items: center; width: 36px; height: 36px; color: #ffd7cf; border: 1px solid rgba(242, 103, 74, .6); border-radius: 9px; background: rgba(157, 62, 53, .72); }
.bot-thinking { display: flex; align-items: center; justify-content: center; gap: .5rem; margin: .7rem 0 0; padding: .65rem; color: #c9e8f4; border: 1px solid rgba(53, 208, 226, .3); border-radius: 10px; background: rgba(53, 208, 226, .08); font-size: .75rem; }
@media (max-width: 420px) { .bot-lobby-controls { grid-template-columns: 1fr; }.bot-lobby-controls > div { grid-column: 1; }.lobby-player-list article { grid-template-columns: 28px minmax(0, 1fr); }.bot-row-actions { grid-column: 1 / -1; justify-content: flex-end; } }
</style>
