<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import QrcodeVue from "qrcode.vue";
import { ASSETS, LEVER_CARDS, RESOURCES, TREND_CARDS } from "@richesses-espace/game";
import type { BotProfile } from "@richesses-espace/protocol";
import { useGameStore } from "../stores/game";
import LandingNotice from "../components/LandingNotice.vue";
import WorldBoard from "../components/WorldBoard.vue";
import ErrorToast from "../components/ErrorToast.vue";
import SoundToggle from "../components/SoundToggle.vue";
import HelpOverlay from "../components/HelpOverlay.vue";
import DiceAnimation from "../components/DiceAnimation.vue";
import ResourceInfluenceScore from "../components/ResourceInfluenceScore.vue";
import PlayerTokenIcon from "../components/PlayerTokenIcon.vue";
import PaymentTransfer from "../components/PaymentTransfer.vue";
import GameIcon from "../components/GameIcon.vue";
import { Bot, HelpCircle, Maximize2, Menu, Pause } from "@lucide/vue";
import { splitPlayerWings } from "./display-layout";

const store = useGameStore();
const route = useRoute();
const fullscreen = ref(Boolean(document.fullscreenElement));
function syncFullscreen(): void { fullscreen.value = Boolean(document.fullscreenElement); }
onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreen);
  void store.createDisplaySession();
});
onBeforeUnmount(() => document.removeEventListener("fullscreenchange", syncFullscreen));

const joinUrl = computed(() => store.game?.joinUrls[0] ?? (store.game ? `${location.origin}/play/${store.game.code}` : ""));
const crewSlots = computed(() => Array.from({ length: 6 }, (_, index) => store.game?.players[index] ?? null));
const playerWings = computed(() => splitPlayerWings(store.game?.players ?? []));
const active = computed(() => store.game?.players.find((player) => player.id === store.game?.activePlayerId));
const botThinkingPlayer = computed(() => store.game?.players.find((player) => player.id === store.game?.botThinkingPlayerId) ?? null);
const botProfileLabels: Record<BotProfile, string> = { CAUTIOUS: "Prudent", BALANCED: "Équilibré", AMBITIOUS: "Ambitieux" };
const landedAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.landedAssetId));
const auctionAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.auction?.assetId));
const landedOwner = computed(() => store.game?.players.find((player) => player.id === (landedAsset.value ? store.game?.ownership[landedAsset.value.id] : null)) ?? null);
const paymentPayer = computed(() => store.game?.players.find((player) => player.id === store.game?.pendingPayment?.payerId) ?? null);
const paymentRecipient = computed(() => store.game?.players.find((player) => player.id === store.game?.pendingPayment?.recipientId) ?? null);
const pausedPlayer = computed(() => store.game?.players.find((player) => player.id === store.game?.pausePlayerId) ?? null);
const winner = computed(() => store.game?.players.find((player) => player.id === store.game?.winnerId) ?? null);
const ranking = computed(() => [...(store.game?.players ?? [])].sort((a, b) => b.netWorth - a.netWorth));
const auctionLeader = computed(() => store.game?.players.find((player) => player.id === store.game?.auction?.leaderId) ?? null);
const auctionSeller = computed(() => store.game?.players.find((player) => player.id === store.game?.auction?.sellerId) ?? null);
const auctionLotAssets = computed(() => store.game?.auction?.lots[store.game.auction.currentLotIndex]?.map((id) => ASSETS.find((asset) => asset.id === id)!).filter(Boolean) ?? []);
const tradeProposer = computed(() => store.game?.players.find((player) => player.id === store.game?.tradeOffer?.proposerId) ?? null);
const tradeTarget = computed(() => store.game?.players.find((player) => player.id === store.game?.tradeOffer?.targetId) ?? null);
const revealedCard = computed(() => {
  const card = store.game?.lastCard;
  if (!card) return null;
  return card.kind === "trend" ? TREND_CARDS.find((item) => item.id === card.id) : LEVER_CARDS.find((item) => item.id === card.id);
});
const portfolioResources = (assetIds: readonly string[]) => RESOURCES.filter((resource) => ASSETS.some((asset) => asset.resourceId === resource.id && assetIds.includes(asset.id)));
const tvResourceLimit = (wingPlayerCount: number) => wingPlayerCount <= 1 ? 6 : wingPlayerCount === 2 ? 4 : 2;
const visiblePortfolioResources = (assetIds: readonly string[], wingPlayerCount: number) => portfolioResources(assetIds).slice(0, tvResourceLimit(wingPlayerCount));
const hiddenPortfolioResourceCount = (assetIds: readonly string[], wingPlayerCount: number) => Math.max(0, portfolioResources(assetIds).length - tvResourceLimit(wingPlayerCount));
const resourceGroupLabel = (player: typeof tradeProposer.value, resourceId: string | null) => {
  if (!player || !resourceId) return "Aucune concession";
  const resource = RESOURCES.find((item) => item.id === resourceId);
  const titles = ASSETS.filter((asset) => asset.resourceId === resourceId && player.assetIds.includes(asset.id));
  return `${resource?.name ?? "Ressource"} · ${titles.length} concession${titles.length > 1 ? "s" : ""} · ${titles.reduce((total, asset) => total + asset.sharePercent, 0)} %`;
};
const notificationTone = (type: string) => type.includes("payment") || type.includes("dividend") ? "money" : type.includes("purchase") || type.includes("auction") || type.includes("trade") ? "action" : type.includes("paused") || type.includes("bankrupt") || type.includes("customs") || type.includes("skipped") ? "warning" : type.includes("trend") ? "cosmic" : "info";
const notificationLabel = (type: string) => type.includes("payment") ? "Transfert de crédits stellaires" : type.includes("dividend") ? "Prime d’expédition" : type.includes("customs") || type.includes("skipped") ? "Quarantaine orbitale" : type.includes("purchase") ? "Nouvelles concessions" : type.includes("auction") ? "Marché orbital" : type.includes("trade") ? "Transfert de concessions" : type.includes("paused") ? "Partie en pause" : type.includes("trend") ? "Événement cosmique" : type === "space_landed" ? "Nouvelle escale" : "Carnet de bord";
const notificationIcon = (type: string) => type.includes("payment") ? "payment" : type.includes("dividend") ? "dividend" : type.includes("customs") || type.includes("skipped") ? "customs" : type.includes("purchase") ? "purchase" : type.includes("auction") ? "auction" : type.includes("trend") ? "trend" : type.includes("paused") ? "customs" : type === "space_landed" ? "start" : "resolved";

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}
</script>

<template>
  <main class="display-shell">
    <header :class="['display-header', { 'display-header--game': store.game && store.game.phase !== 'LOBBY' }]" data-tv-zone="menu">
      <RouterLink v-if="!store.game || store.game.phase === 'LOBBY'" to="/display" class="brand"><span class="brand-mark"><GameIcon name="reward" /></span><span>RICHESSES DE L’ESPACE<small>Consortiums interstellaires</small></span></RouterLink>
      <template v-if="store.game">
        <div class="session-code"><span>Expédition</span><b>{{ store.game.code }}</b></div>
        <div v-if="store.game.status !== 'LOBBY'" class="round-label">Ronde <b>{{ store.game.roundNumber }}</b></div>
      </template>
      <details v-if="store.game && store.game.phase !== 'LOBBY'" class="game-menu">
        <summary><Menu :size="19" aria-hidden="true" /> <span>Menu</span></summary>
        <div class="game-menu__popover">
          <div class="game-menu__heading"><strong>Expédition {{ store.game.code }}</strong><span>Ronde {{ store.game.roundNumber }} · sans limite</span></div>
          <div class="game-menu__tools"><HelpOverlay compact /><button class="fullscreen-trigger" type="button" :aria-pressed="fullscreen" @click="toggleFullscreen"><Maximize2 :size="18" aria-hidden="true" /><span>{{ fullscreen ? 'Quitter le plein écran' : 'Plein écran' }}</span></button><SoundToggle /><RouterLink class="game-menu__link" to="/credits">Crédits visuels</RouterLink></div>
        </div>
      </details>
      <template v-else><HelpOverlay compact /><button class="fullscreen-trigger" type="button" :aria-pressed="fullscreen" @click="toggleFullscreen"><Maximize2 :size="18" aria-hidden="true" /><span>{{ fullscreen ? 'Quitter le plein écran' : 'Plein écran' }}</span></button><SoundToggle /><RouterLink class="text-link" to="/credits">Crédits</RouterLink></template>
    </header>

    <section v-if="!store.game" class="loading-state"><span class="spinner" /><p>Ouverture du relais spatial…</p></section>

    <section v-else-if="store.game.phase === 'LOBBY'" class="lobby-display">
      <div class="lobby-intro">
        <p class="eyebrow">Aventure privée · réseau local</p>
        <h1>Le cosmos<br><em>vous appelle.</em></h1>
        <p>Scannez, choisissez votre emblème de pion et fondez votre consortium. Les routes galactiques sont prêtes à vous accueillir.</p>
        <div class="join-card scan-card">
          <div class="qr-wrap"><QrcodeVue :value="joinUrl" :size="176" level="M" /></div>
          <div><span>Scanne pour embarquer</span><b>{{ store.game.code }}</b><a :href="joinUrl">{{ joinUrl }}</a></div>
        </div>
        <div v-if="store.game.joinUrls.length > 1" class="alternate-urls">
          <span>Autres interfaces réseau :</span><code v-for="url in store.game.joinUrls.slice(1)" :key="url">{{ url }}</code>
        </div>
      </div>

      <div class="lobby-roster panel">
        <div class="panel-heading"><span>Rassemblez l’équipage</span><b>{{ store.game.players.length }}/6</b></div>
        <div class="crew-grid">
          <div v-for="(player, index) in crewSlots" :key="player?.id ?? `empty-${index}`" class="crew-slot" :class="{ occupied: player, ready: player?.ready }">
            <template v-if="player">
              <i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>
              <span><strong>{{ player.name }}</strong><small v-if="player.isBot" class="bot-label"><Bot :size="13" aria-hidden="true" /> Robot · {{ botProfileLabels[player.botProfile!] }}</small><small v-else>{{ !player.connected ? 'hors ligne' : player.ready ? 'prêt·e à partir' : 'se prépare' }}</small></span>
            </template>
            <template v-else><i class="crew-slot__empty">{{ index + 1 }}</i><span><strong>Place libre</strong><small>Scannez pour embarquer</small></span></template>
          </div>
        </div>
        <p class="button-help"><HelpCircle :size="17" aria-hidden="true" /> Le premier téléphone rejoint devient l’hôte. Il lancera la partie dès que deux joueurs seront prêts.</p>
      </div>

      <section class="lobby-rules" aria-labelledby="lobby-rules-title">
        <header class="lobby-rules__heading">
          <div>
            <p class="eyebrow">Pendant que l’équipage se rassemble</p>
            <h2 id="lobby-rules-title">Une partie en quatre repères</h2>
          </div>
          <span>Les règles complètes restent accessibles via « Aide ».</span>
        </header>
        <ol>
          <li><b>1</b><div><strong>Lancez et avancez</strong><span>Le téléphone actif lance les deux dés ; le jeton progresse case par case sur l’écran commun.</span></div></li>
          <li><b>2</b><div><strong>Le monde ouvre son registre</strong><span>Sur une case classique, choisissez jusqu’à six concessions encore disponibles dans le monde indiqué.</span></div></li>
          <li><b>3</b><div><strong>La ressource déclenche les droits</strong><span>Les parts d’une même ressource se cumulent, quels que soient leur monde, leur système et leur secteur.</span></div></li>
          <li><b>4</b><div><strong>Atteignez les paliers</strong><span>À 30, 50, 70 puis 90 %, vos droits d’extraction augmentent. Le dernier consortium opérationnel gagne.</span></div></li>
        </ol>
      </section>
    </section>

    <template v-else>
      <section class="game-display">
        <aside v-for="(wingPlayers, wingIndex) in playerWings" :key="wingIndex" :class="['players-panel', 'panel', wingIndex === 0 ? 'players-panel--left' : 'players-panel--right']" :style="{ '--wing-player-count': wingPlayers.length }" :data-tv-zone="wingIndex === 0 ? 'players-left' : 'players-right'">
          <div class="panel-heading"><span>{{ wingIndex === 0 ? 'Équipages · bâbord' : 'Équipages · tribord' }}</span><b>{{ wingPlayers.length }}</b></div>
          <div v-for="player in wingPlayers" :key="player.id" class="player-summary" :class="{ active: player.id === store.game.activePlayerId, bankrupt: player.bankrupt }">
            <div class="player-identity"><i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i><strong>{{ player.name }}</strong><span v-if="player.isBot" class="bot-label"><Bot :size="12" aria-hidden="true" />{{ botProfileLabels[player.botProfile!] }}</span><span v-else-if="!player.connected">hors ligne</span></div>
            <div class="player-balance"><b>{{ player.capital }}</b><small>crédits</small></div>
            <div class="player-metrics"><span>{{ player.assetIds.length }} concession{{ player.assetIds.length > 1 ? 's' : '' }}</span><span>Valeur <b>{{ player.netWorth }}</b></span><span>{{ player.leverCount }} technologie{{ player.leverCount > 1 ? 's' : '' }}</span><span v-if="player.turnsToSkip" class="skip-warning">Quarantaine · prochain tour perdu</span></div>
            <div v-if="player.bankrupt" class="bankrupt-label">Faillite</div>
            <div v-if="player.assetIds.length" class="player-holdings">
              <ResourceInfluenceScore v-for="resource in visiblePortfolioResources(player.assetIds, wingPlayers.length)" :key="resource.id" :resource-id="resource.id" :asset-ids="player.assetIds" :show-royalties-details="false" compact />
              <p v-if="hiddenPortfolioResourceCount(player.assetIds, wingPlayers.length)" class="player-holdings-more">+ {{ hiddenPortfolioResourceCount(player.assetIds, wingPlayers.length) }} ressource{{ hiddenPortfolioResourceCount(player.assetIds, wingPlayers.length) > 1 ? 's' : '' }} · détails complets sur les téléphones</p>
            </div>
          </div>
        </aside>

        <section class="board-stage" data-tv-zone="board">
          <div v-if="store.game.phase !== 'PAUSED'" class="turn-banner" data-tv-zone="turn">
            <template v-if="active"><i :style="{ background: active.color }" /><span>Tour de</span><b>{{ active.name }}</b><small v-if="botThinkingPlayer"><Bot :size="14" aria-hidden="true" /> réfléchit…</small></template>
          </div>
          <WorldBoard :board="store.game.board" :players="store.game.players" :ownership="store.game.ownership" :active-player-id="store.game.activePlayerId" :visual-positions="store.visualPlayerPositions" />
          <PaymentTransfer v-if="store.game.pendingPayment && paymentPayer && paymentRecipient" :payer="paymentPayer" :recipient="paymentRecipient" :amount="store.game.pendingPayment.amount" />
          <DiceAnimation v-if="store.diceAnimation" class="dice-animation-tv" :dice="store.diceAnimation.dice" :total="store.diceAnimation.total" :rolling="store.diceAnimation.rolling" />
          <div v-if="store.game.phase === 'PAUSED'" class="pause-overlay">
            <div class="pause-icon" aria-label="Partie en pause"><Pause :size="31" aria-hidden="true" /></div>
            <p class="eyebrow">Partie momentanément gelée</p>
            <h2>{{ store.game.pauseReason === 'PLAYER_DISCONNECTED' ? 'Connexion interrompue' : 'Pause demandée par l’hôte' }}</h2>
            <p v-if="pausedPlayer && !pausedPlayer.connected"><strong>{{ pausedPlayer.name }}</strong> n’est plus connecté·e. Son téléphone peut simplement rouvrir la page : sa session sera restaurée automatiquement.</p>
            <p v-else-if="pausedPlayer"><strong>{{ pausedPlayer.name }}</strong> est de retour. Tous les joueurs sont reconnectés : l’hôte peut maintenant appuyer sur « Reprendre ».</p>
            <p v-else>Les actions et le chronomètre sont suspendus. L’hôte peut reprendre quand tout le monde est prêt.</p>
            <div class="pause-status"><span v-for="player in store.game.players" :key="player.id" :class="{ offline: !player.connected }"><i :style="{ background: player.color }" />{{ player.name }} · {{ player.connected ? 'connecté·e' : 'hors ligne' }}</span></div>
            <p class="pause-action-help">La reprise et la fin de partie restent disponibles sur le téléphone de l’hôte.</p>
          </div>
          <div v-else-if="store.game.phase === 'FINISHED'" class="result-overlay">
            <p class="eyebrow">{{ store.game.finishReason === 'LAST_SOLVENT' ? 'Dernier consortium actif' : 'Partie interrompue' }}</p><h2>{{ store.game.finishReason === 'LAST_SOLVENT' ? `${winner?.name ?? 'La table'} conquiert l’espace` : 'La partie est terminée' }}</h2><p v-if="store.game.finishReason === 'LAST_SOLVENT'">Tous les autres consortiums ont perdu leur licence galactique.</p>
            <ol><li v-for="(player, index) in ranking" :key="player.id"><span>{{ index + 1 }}</span><i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i><b>{{ player.name }}</b><strong>{{ player.netWorth }}</strong></li></ol>
            <p>Le téléphone de l’hôte permet de préparer une nouvelle expédition avec le même équipage.</p>
          </div>
          <div v-else-if="store.game.auction && auctionAsset" class="market-overlay auction-overlay">
            <template v-if="store.game.auction.mode === 'selection'"><p class="eyebrow">Marché orbital · dé rouge {{ store.game.auction.redDie }}</p><h2>{{ auctionSeller?.name }} choisit {{ store.game.auction.targetCount }} concession{{ store.game.auction.targetCount > 1 ? 's' : '' }} à vendre</h2><p>La vente ne commencera qu’après confirmation des lots sur son téléphone. Une Technologie peut encore éviter cette vente.</p></template>
            <template v-else><p class="eyebrow">{{ store.game.auction.bankSale ? 'Perte de licence · vente par la banque' : 'Marché orbital' }} · lot {{ store.game.auction.currentLotIndex + 1 }}/{{ store.game.auction.lots.length }}</p><h2>{{ auctionLotAssets.map(asset => asset.name).join(' + ') }}</h2><p>{{ store.game.auction.bankSale ? `Concessions remises aux registres après la faillite de ${auctionSeller?.name}.` : `Vendeur : ${auctionSeller?.name}.` }} Prix de départ à la moitié de la valeur d’achat.</p><div class="big-bid">{{ store.game.auction.currentBid || store.game.auction.minimumBid }}<small>crédits</small></div><p>{{ auctionLeader ? `${auctionLeader.name} mène le marché. Le délai repart pour 10 secondes.` : 'Première offre attendue sur les téléphones.' }}</p><div class="auction-participants"><span v-for="playerId in store.game.auction.eligiblePlayerIds" :key="playerId" :class="{ passed: store.game.auction.passedPlayerIds.includes(playerId) }">{{ store.game.players.find(player => player.id === playerId)?.name }} · {{ store.game.auction.passedPlayerIds.includes(playerId) ? 'retiré·e' : playerId === store.game.auction.leaderId ? 'en tête' : 'en course' }}</span></div></template>
          </div>
          <div v-else-if="store.game.tradeOffer" class="market-overlay trade-overlay-common">
            <p class="eyebrow">{{ store.game.tradeOffer.kind === 'alliance' ? 'Consortium conjoint proposé' : 'Transaction proposée' }}</p><h2>{{ tradeProposer?.name }} ↔ {{ tradeTarget?.name }}</h2>
            <p v-if="store.game.tradeOffer.kind === 'alliance'">Les deux joueurs souhaitent réunir leurs portefeuilles. Chacun versera {{ store.game.tradeOffer.allianceTax }} crédits à la Banque interstellaire et le pion du portefeuille le plus précieux pilotera le consortium.</p>
            <div v-else class="trade-common-grid">
              <div><span>{{ tradeProposer?.name }} cède</span><b>{{ resourceGroupLabel(tradeProposer, store.game.tradeOffer.offeredResourceId) }}</b><small v-if="store.game.tradeOffer.offeredCredits">+ {{ store.game.tradeOffer.offeredCredits }} crédit(s)</small></div>
              <div><span>{{ tradeTarget?.name }} cède</span><b>{{ resourceGroupLabel(tradeTarget, store.game.tradeOffer.requestedResourceId) }}</b><small v-if="store.game.tradeOffer.requestedCredits">+ {{ store.game.tradeOffer.requestedCredits }} crédit(s)</small></div>
            </div>
            <p>Réponse attendue de {{ tradeTarget?.name }} sur son téléphone.</p>
          </div>
          <div v-else-if="revealedCard" class="card-reveal-common" :class="store.game.lastCard?.kind"><p class="eyebrow">{{ store.game.lastCard?.kind === 'trend' ? 'Événement cosmique' : 'Nouvelle Technologie' }}</p><h2>{{ revealedCard.title }}</h2><p>{{ revealedCard.description }}</p></div>
          <div v-if="store.game.lastRoll && !store.diceAnimation" class="dice-result" data-tv-zone="dice"><span class="red-die" title="Dé rouge — détermine le nombre de concessions à vendre sur un Marché orbital">{{ store.game.lastRoll.dice[0] }}</span><span>{{ store.game.lastRoll.dice[1] }}</span><b>{{ store.game.lastRoll.total }}</b></div>
          <aside v-if="store.notifications.length" class="notification-center" aria-label="Notifications de la partie" aria-live="polite">
            <header><span>À retenir</span></header>
            <TransitionGroup name="notification" tag="div" class="notification-stack">
              <article v-for="notification in [...store.notifications].reverse()" :key="notification.key" class="event-notification" :class="`tone-${notificationTone(notification.event.type)}`">
                <i aria-hidden="true"><GameIcon :name="notificationIcon(notification.event.type)" /></i>
                <div><small>{{ notificationLabel(notification.event.type) }}</small><p>{{ notification.event.message }}</p></div>
              </article>
            </TransitionGroup>
          </aside>
        </section>

        <aside class="context-panel" data-tv-zone="context">
          <LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact />
          <div v-if="store.game.pendingPayment" class="panel payment-public">
            <span>Droit d’extraction à régler</span><b>{{ store.game.pendingPayment.amount }} crédit{{ store.game.pendingPayment.amount > 1 ? 's' : '' }}</b>
            <p>{{ store.game.players.find(player => player.id === store.game?.pendingPayment?.payerId)?.name }} doit confirmer le transfert vers {{ paymentRecipient?.name }} sur son téléphone.</p>
          </div>
          <div v-else class="panel history-panel">
            <div class="panel-heading"><span>Carnet de bord</span></div>
            <ol><li v-for="event in [...store.game.recentEvents].reverse().slice(0, 7)" :key="`${event.id}-${event.type}`">{{ event.message }}</li></ol>
          </div>
        </aside>
      </section>
    </template>

    <ErrorToast v-if="store.error" :message="store.error" @dismiss="store.error = ''" />
  </main>
</template>
