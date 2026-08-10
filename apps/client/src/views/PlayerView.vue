<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ASSETS, COUNTRIES, LEVER_CARDS, RESOURCES, STARTING_CAPITAL, TREND_CARDS } from "@orbisium/game";
import { PLAYER_COLORS, PLAYER_SYMBOLS } from "@orbisium/protocol";
import { useGameStore } from "../stores/game";
import AssetCard from "../components/AssetCard.vue";
import LandingNotice from "../components/LandingNotice.vue";
import SoundToggle from "../components/SoundToggle.vue";
import HelpOverlay from "../components/HelpOverlay.vue";
import DiceAnimation from "../components/DiceAnimation.vue";
import ResourceInfluenceScore from "../components/ResourceInfluenceScore.vue";
import PlayerTokenIcon from "../components/PlayerTokenIcon.vue";
import { ArrowLeftRight, Dices, HandCoins, ShoppingCart } from "@lucide/vue";

const route = useRoute();
const store = useGameStore();
const code = String(route.params.code ?? "").toUpperCase();
const name = ref("");
const color = ref<string>(PLAYER_COLORS[0]);
const symbol = ref<string>(PLAYER_SYMBOLS[0].id);
const joining = ref(false);
const tradeOpen = ref(false);
const tradeMode = ref<"purchase" | "sale" | "exchange">("exchange");
const tradeTargetId = ref("");
const offeredResourceId = ref("");
const requestedResourceId = ref("");
const offeredCredits = ref(0);
const requestedCredits = ref(0);
const bidAmount = ref(1);
const auctionSelection = ref<string[]>([]);
const purchaseSelection = ref<string[]>([]);

onMounted(() => { void store.resumePlayer(code); });
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
const auctionAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.auction?.assetId));
const auctionSeller = computed(() => store.game?.players.find((player) => player.id === store.game?.auction?.sellerId) ?? null);
const auctionLotAssets = computed(() => store.game?.auction?.lots[store.game.auction.currentLotIndex]?.map((id) => ASSETS.find((asset) => asset.id === id)!).filter(Boolean) ?? []);
const auctionMinimum = computed(() => store.game?.auction ? (store.game.auction.currentBid ? Math.round((store.game.auction.currentBid + .1) * 10) / 10 : store.game.auction.minimumBid) : .5);
const leverCards = computed(() => LEVER_CARDS.filter((card) => store.player?.leverIds.includes(card.id)));
const pendingLeverCard = computed(() => LEVER_CARDS.find((card) => card.id === store.game?.pendingLever?.leverId) ?? null);
const tradeTargets = computed(() => store.game?.players.filter((player) => player.id !== me.value?.id && !player.bankrupt) ?? []);
const tradeTarget = computed(() => store.game?.players.find((player) => player.id === tradeTargetId.value) ?? null);
const targetResources = computed(() => RESOURCES.filter((resource) => tradeTarget.value?.assetIds.some((assetId) => ASSETS.find((asset) => asset.id === assetId)?.resourceId === resource.id)));
const anyTargetHasResources = computed(() => tradeTargets.value.some((player) => player.assetIds.length));
const isMyTurn = computed(() => store.game?.activePlayerId === me.value?.id);
const isMobileHost = computed(() => Boolean(store.player?.isHost && store.game?.displayMode === "MOBILE_ONLY"));
const canHostStart = computed(() => Boolean(isMobileHost.value && store.game && store.game.players.length >= 2 && store.game.players.every((player) => player.connected && player.ready)));
const hasPrimaryTurnAction = computed(() => allowed("ROLL_DICE") || allowed("END_TURN"));
const currentTrade = computed(() => store.game?.tradeOffer ?? null);
const tradeProposer = computed(() => store.game?.players.find((player) => player.id === currentTrade.value?.proposerId) ?? null);
const tradeTargetPlayer = computed(() => store.game?.players.find((player) => player.id === currentTrade.value?.targetId) ?? null);
const lastCard = computed(() => {
  const card = store.game?.lastCard;
  if (!card) return null;
  return card.kind === "trend" ? TREND_CARDS.find((item) => item.id === card.id) : LEVER_CARDS.find((item) => item.id === card.id);
});
const assetName = (id: string | null) => ASSETS.find((asset) => asset.id === id)?.name ?? "aucune implantation";
const resourceGroupLabel = (player: typeof me.value, resourceId: string | null) => {
  if (!player || !resourceId) return "Aucun titre";
  const resource = RESOURCES.find((item) => item.id === resourceId);
  const titles = ASSETS.filter((asset) => asset.resourceId === resourceId && player.assetIds.includes(asset.id));
  const share = titles.reduce((total, asset) => total + asset.share, 0);
  return `${resource?.name ?? "Ressource"} · ${titles.length} titre${titles.length > 1 ? "s" : ""} · ${share} %`;
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
watch(() => store.game?.auction?.mode === "selection" ? `${store.game.turnNumber}:${store.game.auction.sellerId}:${store.game.landedSpaceId}` : null, () => { auctionSelection.value = []; });
watch(() => store.game?.pendingPurchase ? `${store.game.turnNumber}:${store.game.landedSpaceId}` : null, () => { purchaseSelection.value = []; });

async function run(action: () => Promise<unknown>) { try { await action(); } catch { /* affiché */ } }
async function join() {
  joining.value = true;
  try { await store.join(code, name.value, color.value, symbol.value); } catch { /* affiché */ }
  finally { joining.value = false; }
}
function openTrade(mode: "purchase" | "sale" | "exchange") {
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
  await run(() => store.proposeTrade({ targetId: tradeTargetId.value, offeredResourceId: offeredResourceId.value || null, requestedResourceId: requestedResourceId.value || null, offeredCredits: Number(offeredCredits.value), requestedCredits: Number(requestedCredits.value) }));
  if (!store.error) tradeOpen.value = false;
}
function placeCurrentBid() { return store.bid(Math.max(auctionMinimum.value, Number(bidAmount.value))); }
async function shareInvitation() {
  const url = store.game?.joinUrls[0] ?? window.location.href;
  const data = { title: "Rejoindre Orbisium", text: `Rejoins la table ${code}`, url };
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
    <header class="phone-header"><div class="brand compact"><span class="brand-mark">O</span><span>ORBISIUM</span></div><div class="phone-tools"><HelpOverlay compact /><SoundToggle /><span class="connection-dot" :class="{ online: store.connected }" /></div></header>
    <details v-if="isMobileHost && store.game?.phase !== 'LOBBY'" class="mobile-host-menu">
      <summary>Commandes de l’hôte</summary>
      <div>
        <button v-if="store.game?.phase === 'PAUSED'" type="button" @click="run(store.resumeGame)">Reprendre</button>
        <button v-else-if="store.game?.phase !== 'FINISHED'" type="button" @click="run(store.pause)">Mettre en pause</button>
        <button v-if="store.game?.phase === 'FINISHED'" type="button" @click="run(store.restart)">Rejouer avec le groupe</button>
        <button v-else type="button" class="danger" @click="finishAsHost">Terminer</button>
      </div>
    </details>

    <section v-if="!store.player" class="join-screen">
      <p class="eyebrow">Table {{ code }}</p>
      <h1>Entrez dans<br><em>le cercle.</em></h1>
      <form class="join-form" @submit.prevent="join">
        <label>Votre prénom<input v-model="name" maxlength="20" autocomplete="name" placeholder="Mathieu" required /></label>
        <fieldset><legend>Votre couleur</legend><div class="color-picker"><button v-for="choice in PLAYER_COLORS" :key="choice" type="button" :class="{ selected: color === choice }" :style="{ '--choice': choice }" @click="color = choice" /></div></fieldset>
        <fieldset><legend>Votre animal</legend><div class="symbol-picker"><button v-for="choice in PLAYER_SYMBOLS" :key="choice.id" type="button" :title="choice.label" :aria-label="choice.label" :class="{ selected: symbol === choice.id }" @click="symbol = choice.id"><PlayerTokenIcon :symbol="choice.id" /></button></div></fieldset>
        <button class="primary-button" :disabled="joining || !name.trim()">Rejoindre la table</button>
      </form>
    </section>

    <template v-else-if="store.game && me">
      <section v-if="store.game.phase === 'LOBBY'" class="phone-lobby">
        <p class="eyebrow">Table {{ store.game.code }}</p><h1>Bienvenue,<br><em>{{ me.name }}.</em></h1>
        <div class="identity-card"><i class="player-token" :style="{ background: me.color }"><PlayerTokenIcon :symbol="me.symbol" /></i><div><span>Capital au lancement</span><b>{{ startingCapital }} crédits</b></div></div>
        <button class="primary-button" :class="{ confirmed: me.ready }" :disabled="store.pending" @click="run(() => store.setReady(!me!.ready))">{{ me.ready ? 'Prêt·e — modifier' : 'Je suis prêt·e' }}</button>
        <p class="waiting-copy">{{ me.ready ? 'La partie commencera dès que tout l’équipage sera prêt.' : 'Confirmez quand vous êtes installé·e.' }}</p>
        <div v-if="isMobileHost" class="mobile-host-lobby">
          <button type="button" class="secondary-button" @click="shareInvitation">Partager le lien · {{ store.game.code }}</button>
          <button type="button" class="primary-button" :disabled="!canHostStart || store.pending" @click="run(store.startGame)">Lancer la partie</button>
          <small v-if="!canHostStart">Deux joueurs connectés et prêts sont nécessaires.</small>
        </div>
        <div class="mini-roster"><span v-for="player in store.game.players" :key="player.id"><i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>{{ player.name }}</span></div>
      </section>

      <section v-else class="controller-screen">
        <DiceAnimation v-if="store.diceAnimation && store.diceAnimation.playerId === me.id" class="dice-animation-phone" :dice="store.diceAnimation.dice" :total="store.diceAnimation.total" :rolling="store.diceAnimation.rolling" compact />
        <Transition name="event"><div v-if="personalMoneyNotice" class="personal-money-notice">{{ personalMoneyNotice }}</div></Transition>
        <div class="controller-meta"><div><span>Ronde {{ store.game.roundNumber }}</span><b>{{ me.name }}</b></div><div class="capital"><span>Capital</span><b>{{ me.capital }}</b></div></div>
        <div v-if="store.game.phase === 'PAUSED'" class="state-message pause-phone"><span class="pause-phone__icon">Ⅱ</span><h2>{{ store.game.pauseReason === 'PLAYER_DISCONNECTED' ? (pausedPlayer?.connected ? 'Connexion rétablie' : 'Connexion interrompue') : 'Pause de l’hôte' }}</h2><p v-if="pausedPlayer && !pausedPlayer.connected"><strong>{{ pausedPlayer.name }}</strong> a perdu la connexion. La partie est gelée jusqu’à son retour, sans modifier les soldes ni le tour.</p><p v-else-if="pausedPlayer"><strong>{{ pausedPlayer.name }}</strong> est revenu·e. L’hôte peut maintenant reprendre la partie depuis l’écran commun.</p><p v-else>L’hôte a suspendu la partie. Gardez cette page ouverte : la reprise apparaîtra automatiquement.</p></div>
        <div v-else-if="store.game.phase === 'FINISHED'" class="state-message final-phone"><p class="eyebrow">Partie terminée</p><h2>{{ store.game.winnerId === me.id ? 'Vous remportez la partie !' : `${store.game.players.find(player => player.id === store.game?.winnerId)?.name ?? 'La table'} remporte la partie.` }}</h2><p>Votre patrimoine final atteint {{ me.netWorth }} crédits : {{ me.capital }} liquides et {{ me.assetIds.length }} implantation(s).</p></div>
        <div v-else-if="me.bankrupt" class="state-message bankruptcy-state"><p class="eyebrow">Faillite déclarée</p><h2>Vous quittez la partie.</h2><p>Vous restez spectateur jusqu’au classement final.</p></div>
        <div v-else-if="currentTrade" class="trade-response">
          <p class="eyebrow">Transaction entre joueurs</p><h2>{{ tradeProposer?.name }} propose un accord à {{ tradeTargetPlayer?.name }}.</h2>
          <div class="trade-summary"><div><span>{{ tradeProposer?.name }} cède</span><b>{{ resourceGroupLabel(tradeProposer, currentTrade.offeredResourceId) }}</b><small v-if="currentTrade.offeredCredits">+ {{ currentTrade.offeredCredits }} crédit(s)</small></div><div><span>{{ tradeTargetPlayer?.name }} cède</span><b>{{ resourceGroupLabel(tradeTargetPlayer, currentTrade.requestedResourceId) }}</b><small v-if="currentTrade.requestedCredits">+ {{ currentTrade.requestedCredits }} crédit(s)</small></div></div>
          <div v-if="allowed('ACCEPT_TRADE')" class="action-row"><button class="secondary-button" @click="run(store.rejectTrade)">Refuser</button><button class="primary-button" @click="run(store.acceptTrade)">Accepter l’échange</button></div>
          <button v-else-if="allowed('REJECT_TRADE')" class="secondary-button wide-button" @click="run(store.rejectTrade)">Retirer mon offre</button>
          <p v-else class="waiting-copy">La réponse est attendue sur le téléphone de {{ tradeTargetPlayer?.name }}.</p>
        </div>
        <div v-else-if="store.game.auction && auctionAsset" class="auction-phone">
          <template v-if="store.game.auction.mode === 'selection'">
            <p class="eyebrow">Vente forcée · dé rouge {{ store.game.auction.redDie }}</p><h2>{{ auctionSeller?.name }} doit sélectionner {{ store.game.auction.targetCount }} implantation{{ store.game.auction.targetCount > 1 ? 's' : '' }}.</h2>
            <div v-if="allowed('SELECT_AUCTION_ASSETS')" class="auction-selection"><label v-for="assetId in me.assetIds" :key="assetId" :class="{ selected: auctionSelection.includes(assetId) }"><input v-model="auctionSelection" type="checkbox" :value="assetId" /><span>{{ assetName(assetId) }}</span><b>{{ ASSETS.find(asset => asset.id === assetId)?.basePrice }} cr.</b></label><button class="primary-button wide-button" :disabled="!auctionSelection.length || store.pending" @click="run(() => store.selectAuctionAssets(auctionSelection))">Confirmer les lots</button><p>Les titres d’une même ressource sont vendus ensemble. Si vous ne possédez que des groupes d’au moins quatre titres, le groupe choisi reste entier même s’il dépasse le dé rouge.</p></div>
            <p v-else class="waiting-copy">La sélection des titres est en cours sur le téléphone de {{ auctionSeller?.name }}.</p>
          </template>
          <template v-else>
            <p class="eyebrow">{{ store.game.auction.bankSale ? 'Faillite · vente par la banque' : 'Appel d’offres' }} · lot {{ store.game.auction.currentLotIndex + 1 }}/{{ store.game.auction.lots.length }}</p><h2>{{ auctionLotAssets.map(asset => asset.name).join(' + ') }}</h2><AssetCard :asset-id="auctionAsset.id" compact />
            <p class="auction-seller">{{ store.game.auction.bankSale ? `Titres de ${auctionSeller?.name} remis au catalogue` : `Vendeur : ${auctionSeller?.name}` }} · prix initial à 50 %</p>
            <div class="auction-current"><span>Meilleure offre</span><b>{{ store.game.auction.currentBid || store.game.auction.minimumBid }}</b><small>{{ store.game.players.find(player => player.id === store.game?.auction?.leaderId)?.name ?? 'Prix de départ' }}</small></div>
            <div v-if="allowed('BID')" class="bid-controls"><label>Votre offre<input v-model.number="bidAmount" type="number" step="0.1" :min="auctionMinimum" :max="me.capital" /></label><div class="action-row"><button class="secondary-button" @click="run(store.passBid)">Passer</button><button class="primary-button" :disabled="me.capital < auctionMinimum" @click="run(placeCurrentBid)">Enchérir</button></div><p>Pas minimum : 0,1 crédit. Le lot est adjugé après 10 secondes sans nouvelle offre.</p></div>
            <p v-else class="waiting-copy">{{ store.game.auction.sellerId === me.id ? 'Vous êtes le vendeur et recevrez le prix final.' : store.game.auction.leaderId === me.id ? 'Votre offre est en tête.' : 'Vous avez quitté cet appel d’offres.' }}</p>
          </template>
        </div>
        <div v-else-if="payment && me.id === payment.recipientId" class="payment-receiver-state"><AssetCard v-if="landedAsset" :asset-id="landedAsset.id" :owner="me.name" compact /><div class="state-message"><span class="waiting-pulse" /><p class="eyebrow">Retombée attendue</p><h2>{{ paymentPayer?.name }} vous doit {{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }}.</h2><p>Vous serez crédité dès que le paiement sera confirmé sur son téléphone.</p></div></div>
        <div v-else-if="pendingLeverCard && (allowed('BUY_LEVER') || allowed('PASS_LEVER'))" class="lever-purchase-action"><p class="eyebrow">Case Joker</p><div class="joker-card"><span>JOKER</span><h2>{{ pendingLeverCard.title }}</h2><p>{{ pendingLeverCard.description }}</p><b>{{ store.game.pendingLever?.price }} crédits</b></div><div class="action-row"><button class="secondary-button" :disabled="store.pending" @click="run(store.passLever)">Passer</button><button class="primary-button" :disabled="store.pending || me.capital < (store.game.pendingLever?.price ?? 0)" @click="run(store.buyLever)">Acheter le Joker</button></div></div>
        <div v-else-if="!allowed('ROLL_DICE') && !allowed('BUY_ASSET') && !allowed('PASS_ASSET') && !allowed('PAY_RETURNS') && !allowed('END_TURN')" class="spectator-state"><div class="state-message"><span class="waiting-pulse" /><h2>Tour de {{ store.activePlayer?.name }}</h2><p>Suivez les mouvements sur l’écran commun.</p></div><LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact /></div>
        <div v-else-if="allowed('ROLL_DICE')" class="primary-action action-card action-card--roll"><p class="eyebrow">À vous de jouer</p><h1>Faites avancer l’expédition.</h1><button class="dice-button" :disabled="store.pending" @click="run(store.roll)"><Dices :size="28" aria-hidden="true" />Lancer les dés</button></div>
        <div v-else-if="pendingAsset && allowed('BUY_ASSET')" class="purchase-action country-purchase">
          <p class="eyebrow">{{ store.game.pendingPurchase?.source === 'classic' ? `${pendingCountry?.continent} · ${pendingCountry?.name}` : store.game.pendingPurchase?.source === 'regional' ? 'Comptoir régional' : 'Mandat global' }}</p>
          <h2>{{ store.game.pendingPurchase?.source === 'classic' ? `Choisissez jusqu’à ${store.game.pendingPurchase?.maxAssets} titres du pays` : store.game.pendingPurchase?.label }}</h2>
          <p v-if="store.game.pendingPurchase?.source === 'classic'">Après ce choix, les retombées de <strong>{{ pendingResource?.name }}</strong> seront calculées pour tous les détenteurs atteignant 30 %.</p>
          <p v-else>Choisissez jusqu’à six titres parmi les ressources que vous possédez déjà. Ce choix ne déclenche pas de retombées.</p>
          <div class="auction-selection title-selection"><label v-for="title in pendingTitles" :key="title.id" :class="{ selected: purchaseSelection.includes(title.id) }"><input v-model="purchaseSelection" type="checkbox" :value="title.id" :disabled="!purchaseSelection.includes(title.id) && purchaseSelection.length >= (store.game.pendingPurchase?.maxAssets ?? 6)" /><span>{{ title.name }} · {{ title.share }} %</span><b>{{ title.basePrice }} cr.</b></label></div>
          <div class="purchase-total"><span>{{ purchaseSelection.length }} titre(s)</span><b>{{ purchaseTotal }} crédits</b></div>
          <div class="action-row"><button class="secondary-button" :disabled="store.pending" @click="run(store.pass)">Ne rien acheter</button><button class="primary-button" :disabled="store.pending || !purchaseSelection.length || me.capital < purchaseTotal" @click="run(() => store.buy(purchaseSelection))">Acheter la sélection</button></div>
        </div>
        <div v-else-if="payment && (allowed('PAY_RETURNS') || allowed('DECLARE_BANKRUPTCY'))" class="payment-action">
          <AssetCard :asset-id="payment.assetId" :owner="paymentRecipient?.name ?? null" />
          <div class="payment-summary"><p class="eyebrow">Paiement obligatoire</p><h2>{{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }} à verser</h2><p v-if="allowed('DECLARE_BANKRUPTCY')">Vos liquidités sont insuffisantes. La banque réglera la dette, vos titres retourneront au catalogue puis seront proposés aux autres joueurs pendant 10 secondes.</p><p v-else>Cette retombée rémunère {{ paymentRecipient?.name }}. Le tour ne peut pas se terminer avant votre confirmation.</p><button v-if="allowed('PAY_RETURNS')" class="primary-button payment-button" :disabled="store.pending" @click="run(store.payReturns)">Payer {{ payment.amount }} crédit{{ payment.amount > 1 ? 's' : '' }}</button><button v-if="allowed('DECLARE_BANKRUPTCY')" class="bankruptcy-button" @click="run(store.declareBankruptcy)">Déclarer faillite</button></div>
        </div>
        <div v-else-if="allowed('END_TURN')" class="end-turn-action"><LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact /><div><p class="eyebrow">Case résolue</p><h2>Vous avez pris connaissance de son effet.</h2><button class="primary-button" :disabled="store.pending" @click="run(store.endTurn)">Terminer le tour</button></div></div>

        <aside v-if="allowed('PROPOSE_TRADE') && tradeTargets.length" class="title-actions" :class="{ 'title-actions--with-primary': hasPrimaryTurnAction }" aria-label="Transactions de titres">
          <p v-if="isMyTurn && me.capital === 0">Plus de liquidités : vous pouvez vendre un groupe complet avant de lancer les dés ou de terminer votre tour.</p>
          <div>
            <button v-if="isMyTurn" type="button" :disabled="!anyTargetHasResources || me.capital <= 0" @click="openTrade('purchase')"><ShoppingCart :size="20" aria-hidden="true" /><span>Acheter</span></button>
            <button v-if="isMyTurn" type="button" class="title-actions__sale" :disabled="!myResources.length" @click="openTrade('sale')"><HandCoins :size="20" aria-hidden="true" /><span>Vendre</span></button>
            <button type="button" :disabled="!myResources.length || !anyTargetHasResources" @click="openTrade('exchange')"><ArrowLeftRight :size="20" aria-hidden="true" /><span>Échanger</span></button>
          </div>
        </aside>

        <div v-if="lastCard" class="drawn-card"><p class="eyebrow">{{ store.game.lastCard?.kind === 'trend' ? 'Tendance révélée' : 'Levier obtenu' }}</p><h3>{{ lastCard.title }}</h3><p>{{ lastCard.description }}</p></div>
        <section v-if="leverCards.length" class="lever-hand"><div class="section-title"><span>Vos leviers</span><b>{{ leverCards.length }}</b></div><article v-for="lever in leverCards" :key="lever.id"><div><strong>{{ lever.title }}</strong><p>{{ lever.description }}</p></div><button :disabled="!canUseLever(lever.kind) || store.pending" @click="run(() => store.useLever(lever.id))">Activer</button></article></section>
        <section class="portfolio-section"><div class="section-title"><span>Influence par ressource</span><b>{{ myAssets.length }} titre{{ myAssets.length > 1 ? 's' : '' }}</b></div><div v-if="!myAssets.length" class="empty-portfolio">Vos futurs pourcentages apparaîtront ici.</div><div v-else class="resource-score-list"><ResourceInfluenceScore v-for="resource in myResources" :key="resource.id" :resource-id="resource.id" :asset-ids="me.assetIds" /></div></section>

        <div v-if="tradeOpen" class="trade-backdrop" @click.self="tradeOpen = false">
          <form class="trade-form" @submit.prevent="submitTrade">
            <button type="button" class="help-close" @click="tradeOpen = false">×</button>
            <p class="eyebrow">{{ tradeMode === 'sale' ? 'Vente de titres' : tradeMode === 'purchase' ? 'Achat entre joueurs' : 'Échange de ressources' }}</p>
            <h2>{{ tradeMode === 'sale' ? 'Vendre un groupe complet' : tradeMode === 'purchase' ? 'Faire une offre d’achat' : 'Échanger deux groupes complets' }}</h2>
            <p class="trade-rule-note">Tous vos titres de la ressource choisie sont inclus dans l’accord, quel que soit leur pays d’origine.</p>
            <label>Partenaire<select v-model="tradeTargetId" @change="resetRequestedResource"><option v-for="player in tradeTargets" :key="player.id" :value="player.id">{{ player.name }}</option></select></label>
            <div class="trade-form-grid">
              <fieldset><legend>Vous cédez</legend><label v-if="tradeMode !== 'purchase'">Groupe de ressource<select v-model="offeredResourceId" required><option v-for="resource in myResources" :key="resource.id" :value="resource.id">{{ resourceGroupLabel(me, resource.id) }}</option></select></label><p v-else class="trade-empty-side">Aucun titre</p><label v-if="tradeMode !== 'sale'">Crédits<input v-model.number="offeredCredits" type="number" min="0" step="0.1" :max="me.capital" /></label></fieldset>
              <fieldset><legend>{{ tradeTarget?.name }} cède</legend><label v-if="tradeMode !== 'sale'">Groupe de ressource<select v-model="requestedResourceId" required><option v-for="resource in targetResources" :key="resource.id" :value="resource.id">{{ resourceGroupLabel(tradeTarget, resource.id) }}</option></select></label><p v-else class="trade-empty-side">Aucun titre</p><label v-if="tradeMode !== 'purchase'">Crédits<input v-model.number="requestedCredits" type="number" :min="tradeMode === 'sale' ? 0.1 : 0" step="0.1" :max="tradeTarget?.capital ?? 0" :required="tradeMode === 'sale'" /></label></fieldset>
            </div>
            <button class="primary-button wide-button" :disabled="store.pending">Envoyer l’offre</button>
          </form>
        </div>
      </section>
    </template>
    <section v-else class="loading-state"><span class="spinner" /><p>Connexion à la table…</p></section>
    <div v-if="store.error" class="error-toast" @click="store.error = ''">{{ store.error }}</div>
  </main>
</template>

<style scoped>
.mobile-host-menu { margin: .65rem 1rem 0; padding: .7rem .85rem; color: #18324a; background: #fff; border: 2px solid rgba(24,50,74,.18); border-radius: 12px; }
.mobile-host-menu summary { font-weight: 800; cursor: pointer; }
.mobile-host-menu > div { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: .7rem; }
.mobile-host-menu button { min-height: 46px; padding: .6rem; font: inherit; font-weight: 800; background: #f7f9f6; border: 2px solid #18324a; border-radius: 10px; }
.mobile-host-menu button.danger { color: #a52f2f; border-color: #d84a4a; }
.mobile-host-lobby { display: grid; gap: .75rem; margin: 1rem 0; }
.mobile-host-lobby small { text-align: center; color: #52687a; }
</style>
