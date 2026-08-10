<script setup lang="ts">
import { computed, onMounted } from "vue";
import QrcodeVue from "qrcode.vue";
import { ASSETS, LEVER_CARDS, RESOURCES, SECTORS, TREND_CARDS, type SectorId } from "@orbisium/game";
import { useGameStore } from "../stores/game";
import LandingNotice from "../components/LandingNotice.vue";
import WorldBoard from "../components/WorldBoard.vue";
import SoundToggle from "../components/SoundToggle.vue";
import HelpOverlay from "../components/HelpOverlay.vue";
import DiceAnimation from "../components/DiceAnimation.vue";
import ResourceInfluenceScore from "../components/ResourceInfluenceScore.vue";
import PlayerTokenIcon from "../components/PlayerTokenIcon.vue";
import PaymentTransfer from "../components/PaymentTransfer.vue";
import GameIcon from "../components/GameIcon.vue";
import { HelpCircle, Maximize2, Menu } from "@lucide/vue";

const store = useGameStore();
onMounted(() => { void store.createDisplaySession(); });

const joinUrl = computed(() => store.game?.joinUrls[0] ?? (store.game ? `${location.origin}/play/${store.game.code}` : ""));
const readyToStart = computed(() => Boolean(store.game && store.game.players.length >= 2 && store.game.players.every((player) => player.ready && player.connected)));
const crewSlots = computed(() => Array.from({ length: 6 }, (_, index) => store.game?.players[index] ?? null));
const active = computed(() => store.game?.players.find((player) => player.id === store.game?.activePlayerId));
const landedAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.landedAssetId));
const auctionAsset = computed(() => ASSETS.find((asset) => asset.id === store.game?.auction?.assetId));
const landedOwner = computed(() => store.game?.players.find((player) => player.id === (landedAsset.value ? store.game?.ownership[landedAsset.value.id] : null)) ?? null);
const paymentPayer = computed(() => store.game?.players.find((player) => player.id === store.game?.pendingPayment?.payerId) ?? null);
const paymentRecipient = computed(() => store.game?.players.find((player) => player.id === store.game?.pendingPayment?.recipientId) ?? null);
const pausedPlayer = computed(() => store.game?.players.find((player) => player.id === store.game?.pausePlayerId) ?? null);
const assetsBySector = (assetIds: readonly string[], sectorId: SectorId) => ASSETS.filter((asset) => asset.sectorId === sectorId && assetIds.includes(asset.id));
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
const resourceHoldings = (assetIds: readonly string[], sectorId: SectorId) => RESOURCES.filter((resource) => resource.sectorId === sectorId && ASSETS.some((asset) => asset.resourceId === resource.id && assetIds.includes(asset.id)));
const resourceGroupLabel = (player: typeof tradeProposer.value, resourceId: string | null) => {
  if (!player || !resourceId) return "Aucun titre";
  const resource = RESOURCES.find((item) => item.id === resourceId);
  const titles = ASSETS.filter((asset) => asset.resourceId === resourceId && player.assetIds.includes(asset.id));
  return `${resource?.name ?? "Ressource"} · ${titles.length} titre${titles.length > 1 ? "s" : ""} · ${titles.reduce((total, asset) => total + asset.share, 0)} %`;
};
const notificationTone = (type: string) => type.includes("payment") || type.includes("dividend") ? "money" : type.includes("purchase") || type.includes("auction") || type.includes("trade") ? "action" : type.includes("paused") || type.includes("bankrupt") || type.includes("customs") || type.includes("skipped") ? "warning" : type.includes("trend") ? "market" : "info";
const notificationLabel = (type: string) => type.includes("payment") ? "Transfert de crédits" : type.includes("dividend") ? "Dividende" : type.includes("customs") || type.includes("skipped") ? "Contrôle douanier" : type.includes("purchase") ? "Nouvelle collection" : type.includes("auction") ? "Appel d’offres" : type.includes("trade") ? "Échange" : type.includes("paused") ? "Partie en pause" : type.includes("trend") ? "Tendance mondiale" : type === "space_landed" ? "Nouvelle escale" : "Carnet de bord";
const notificationIcon = (type: string) => type.includes("payment") ? "payment" : type.includes("dividend") ? "dividend" : type.includes("customs") || type.includes("skipped") ? "customs" : type.includes("purchase") ? "purchase" : type.includes("auction") ? "auction" : type.includes("trend") ? "trend" : type.includes("paused") ? "customs" : type === "space_landed" ? "start" : "resolved";

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

async function run(action: () => Promise<unknown>) { try { await action(); } catch { /* affiché par le store */ } }
function finish() { if (window.confirm("Terminer définitivement cette partie ?")) void run(() => store.finish()); }
function restart() { if (window.confirm("Préparer une nouvelle partie avec les mêmes joueurs ? Toutes les données de cette partie seront remises à zéro.")) void run(() => store.restart()); }
</script>

<template>
  <main class="display-shell">
    <header :class="['display-header', { 'display-header--game': store.game && store.game.phase !== 'LOBBY' }]">
      <RouterLink v-if="!store.game || store.game.phase === 'LOBBY'" to="/display" class="brand"><span class="brand-mark">O</span><span>ORBISIUM<small>Les flux dessinent le monde</small></span></RouterLink>
      <template v-if="store.game">
        <div class="session-code"><span>Table</span><b>{{ store.game.code }}</b></div>
        <div v-if="store.game.status !== 'LOBBY'" class="round-label">Ronde <b>{{ store.game.roundNumber }}</b></div>
      </template>
      <details v-if="store.game && store.game.phase !== 'LOBBY'" class="game-menu">
        <summary><Menu :size="19" aria-hidden="true" /> <span>Menu</span></summary>
        <div class="game-menu__popover">
          <div class="game-menu__heading"><strong>Table {{ store.game.code }}</strong><span>Ronde {{ store.game.roundNumber }} · sans limite</span></div>
          <div class="game-menu__tools"><HelpOverlay compact /><button class="fullscreen-trigger" type="button" @click="toggleFullscreen"><Maximize2 :size="18" aria-hidden="true" /><span>Plein écran</span></button><SoundToggle /><RouterLink class="game-menu__link" to="/credits">Crédits photo</RouterLink></div>
          <div v-if="store.game.phase !== 'FINISHED'" class="game-menu__admin">
            <button v-if="store.game.phase === 'PAUSED'" :disabled="store.pending || store.game.players.some(player => !player.connected)" @click="run(store.resumeGame)">Reprendre</button>
            <button v-else :disabled="store.pending" @click="run(store.pause)">Mettre en pause</button>
            <button class="danger-link" :disabled="store.pending" @click="finish">Terminer la partie</button>
          </div>
        </div>
      </details>
      <template v-else><HelpOverlay /><button class="fullscreen-trigger" type="button" @click="toggleFullscreen"><Maximize2 :size="18" aria-hidden="true" /><span>Plein écran</span></button><SoundToggle /><RouterLink class="text-link" to="/credits">Crédits</RouterLink></template>
    </header>

    <section v-if="!store.game" class="loading-state"><span class="spinner" /><p>Ouverture de la table…</p></section>

    <section v-else-if="store.game.phase === 'LOBBY'" class="lobby-display">
      <div class="lobby-intro">
        <p class="eyebrow">Aventure privée · réseau local</p>
        <h1>La table<br><em>vous attend.</em></h1>
        <p>Scannez, choisissez votre jeton et formez votre équipage. Les routes du monde n’attendent plus que vous.</p>
        <div class="join-card scan-card">
          <div class="qr-wrap"><QrcodeVue :value="joinUrl" :size="176" level="M" /></div>
          <div><span>Scanne pour jouer</span><b>{{ store.game.code }}</b><a :href="joinUrl">{{ joinUrl }}</a></div>
        </div>
        <div v-if="store.game.joinUrls.length > 1" class="alternate-urls">
          <span>Autres interfaces réseau :</span><code v-for="url in store.game.joinUrls.slice(1)" :key="url">{{ url }}</code>
        </div>
      </div>

      <div class="lobby-roster panel">
        <div class="panel-heading"><span>Formez votre équipage</span><b>{{ store.game.players.length }}/6</b></div>
        <div class="crew-grid">
          <div v-for="(player, index) in crewSlots" :key="player?.id ?? `empty-${index}`" class="crew-slot" :class="{ occupied: player, ready: player?.ready }">
            <template v-if="player">
              <i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i>
              <span><strong>{{ player.name }}</strong><small>{{ !player.connected ? 'hors ligne' : player.ready ? 'prêt·e à partir' : 'se prépare' }}</small></span>
            </template>
            <template v-else><i class="crew-slot__empty">{{ index + 1 }}</i><span><strong>Place libre</strong><small>Scannez pour rejoindre</small></span></template>
          </div>
        </div>
        <button class="primary-button start-game-button" :disabled="!readyToStart || store.pending" @click="run(store.startGame)">Lancer la partie</button>
        <p class="button-help"><HelpCircle :size="17" aria-hidden="true" /> Deux joueurs connectés et prêts minimum.</p>
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
          <li><b>2</b><div><strong>Le pays ouvre les achats</strong><span>Sur une case classique, choisissez jusqu’à six titres encore disponibles dans le pays indiqué.</span></div></li>
          <li><b>3</b><div><strong>La ressource déclenche les royalties</strong><span>Les parts d’une même ressource se cumulent, quels que soient leur pays et leur continent.</span></div></li>
          <li><b>4</b><div><strong>Atteignez les paliers</strong><span>À 30, 50, 70 puis 90 %, vos royalties augmentent. Le dernier joueur solvable gagne.</span></div></li>
        </ol>
      </section>
    </section>

    <template v-else>
      <section class="game-display">
        <aside :class="['players-panel', 'panel', `players-panel--count-${store.game.players.length}`]">
          <div class="panel-heading"><span>Équipages</span><b>{{ store.game.players.length }}</b></div>
          <div v-for="player in store.game.players" :key="player.id" class="player-summary" :class="{ active: player.id === store.game.activePlayerId, bankrupt: player.bankrupt }">
            <div class="player-identity"><i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i><strong>{{ player.name }}</strong><span v-if="!player.connected">hors ligne</span></div>
            <div class="player-balance"><b>{{ player.capital }}</b><small>crédits</small></div>
            <div class="player-metrics"><span>{{ player.assetIds.length }} implantation{{ player.assetIds.length > 1 ? 's' : '' }}</span><span>Patrimoine <b>{{ player.netWorth }}</b></span><span>{{ player.leverCount }} levier{{ player.leverCount > 1 ? 's' : '' }}</span><span v-if="player.turnsToSkip" class="skip-warning">Prochain tour perdu</span></div>
            <div v-if="player.bankrupt" class="bankrupt-label">Faillite</div>
            <div v-if="player.assetIds.length" class="player-holdings">
              <div v-for="sectorItem in SECTORS" v-show="assetsBySector(player.assetIds, sectorItem.id).length" :key="sectorItem.id" class="holding-sector" :style="{ '--sector-color': sectorItem.color }">
                <div><i /><strong>{{ sectorItem.shortName }}</strong><b>{{ assetsBySector(player.assetIds, sectorItem.id).length }} titre(s)</b></div>
                <ResourceInfluenceScore v-for="resource in resourceHoldings(player.assetIds, sectorItem.id)" :key="resource.id" :resource-id="resource.id" :asset-ids="player.assetIds" :show-royalties-details="false" compact />
              </div>
            </div>
          </div>
        </aside>

        <section class="board-stage">
          <div class="turn-banner">
            <span v-if="store.game.phase === 'PAUSED'">Partie en pause</span>
            <template v-else-if="active"><i :style="{ background: active.color }" /><span>Tour de</span><b>{{ active.name }}</b></template>
          </div>
          <WorldBoard :board="store.game.board" :players="store.game.players" :active-player-id="store.game.activePlayerId" :visual-positions="store.visualPlayerPositions" />
          <PaymentTransfer v-if="store.game.pendingPayment && paymentPayer && paymentRecipient" :payer="paymentPayer" :recipient="paymentRecipient" :amount="store.game.pendingPayment.amount" />
          <DiceAnimation v-if="store.diceAnimation" class="dice-animation-tv" :dice="store.diceAnimation.dice" :total="store.diceAnimation.total" :rolling="store.diceAnimation.rolling" />
          <div v-if="store.game.phase === 'PAUSED'" class="pause-overlay">
            <div class="pause-icon">Ⅱ</div>
            <p class="eyebrow">Partie momentanément gelée</p>
            <h2>{{ store.game.pauseReason === 'PLAYER_DISCONNECTED' ? 'Connexion interrompue' : 'Pause demandée par l’hôte' }}</h2>
            <p v-if="pausedPlayer && !pausedPlayer.connected"><strong>{{ pausedPlayer.name }}</strong> n’est plus connecté·e. Son téléphone peut simplement rouvrir la page : sa session sera restaurée automatiquement.</p>
            <p v-else-if="pausedPlayer"><strong>{{ pausedPlayer.name }}</strong> est de retour. Tous les joueurs sont reconnectés : l’hôte peut maintenant appuyer sur « Reprendre ».</p>
            <p v-else>Les actions et le chronomètre sont suspendus. L’hôte peut reprendre quand tout le monde est prêt.</p>
            <div class="pause-status"><span v-for="player in store.game.players" :key="player.id" :class="{ offline: !player.connected }"><i :style="{ background: player.color }" />{{ player.name }} · {{ player.connected ? 'connecté·e' : 'hors ligne' }}</span></div>
            <div class="pause-actions">
              <button class="primary-button" :disabled="store.pending || store.game.players.some(player => !player.connected)" @click="run(store.resumeGame)">Reprendre la partie</button>
              <button class="secondary-button pause-end-button" :disabled="store.pending" @click="finish">Terminer la partie</button>
            </div>
            <p v-if="store.game.players.some(player => !player.connected)" class="pause-action-help">La reprise sera disponible dès que tous les téléphones seront reconnectés.</p>
          </div>
          <div v-else-if="store.game.phase === 'FINISHED'" class="result-overlay">
            <p class="eyebrow">{{ store.game.finishReason === 'LAST_SOLVENT' ? 'Victoire économique' : 'Classement final' }}</p><h2>{{ store.game.finishReason === 'LAST_SOLVENT' ? `${winner?.name ?? 'La table'} remporte Orbisium` : 'La partie est terminée' }}</h2><p>Patrimoine final en tête : <strong>{{ winner?.netWorth ?? 0 }} crédits</strong></p>
            <ol><li v-for="(player, index) in ranking" :key="player.id"><span>{{ index + 1 }}</span><i class="player-token" :style="{ background: player.color }"><PlayerTokenIcon :symbol="player.symbol" /></i><b>{{ player.name }}</b><strong>{{ player.netWorth }}</strong></li></ol>
            <div class="result-actions"><button class="primary-button" :disabled="store.pending" @click="restart">Rejouer avec les mêmes joueurs</button></div>
          </div>
          <div v-else-if="store.game.auction && auctionAsset" class="market-overlay auction-overlay">
            <template v-if="store.game.auction.mode === 'selection'"><p class="eyebrow">Vente forcée · dé rouge {{ store.game.auction.redDie }}</p><h2>{{ auctionSeller?.name }} choisit {{ store.game.auction.targetCount }} implantation{{ store.game.auction.targetCount > 1 ? 's' : '' }} à vendre</h2><p>La vente ne commencera qu’après confirmation des lots sur son téléphone. Une exemption Joker peut encore annuler cette vente.</p></template>
            <template v-else><p class="eyebrow">{{ store.game.auction.bankSale ? 'Faillite · vente par la banque' : 'Appel d’offres' }} · lot {{ store.game.auction.currentLotIndex + 1 }}/{{ store.game.auction.lots.length }}</p><h2>{{ auctionLotAssets.map(asset => asset.name).join(' + ') }}</h2><p>{{ store.game.auction.bankSale ? `Titres remis au catalogue après la faillite de ${auctionSeller?.name}.` : `Vendeur : ${auctionSeller?.name}.` }} Prix de départ à la moitié de la valeur d’achat.</p><div class="big-bid">{{ store.game.auction.currentBid || store.game.auction.minimumBid }}<small>crédits</small></div><p>{{ auctionLeader ? `${auctionLeader.name} mène l’appel d’offres. Le délai repart pour 10 secondes.` : 'Première offre attendue sur les téléphones.' }}</p><div class="auction-participants"><span v-for="playerId in store.game.auction.eligiblePlayerIds" :key="playerId" :class="{ passed: store.game.auction.passedPlayerIds.includes(playerId) }">{{ store.game.players.find(player => player.id === playerId)?.name }} · {{ store.game.auction.passedPlayerIds.includes(playerId) ? 'retiré·e' : playerId === store.game.auction.leaderId ? 'en tête' : 'en course' }}</span></div></template>
          </div>
          <div v-else-if="store.game.tradeOffer" class="market-overlay trade-overlay-common">
            <p class="eyebrow">Transaction proposée</p><h2>{{ tradeProposer?.name }} ↔ {{ tradeTarget?.name }}</h2>
            <div class="trade-common-grid">
              <div><span>{{ tradeProposer?.name }} cède</span><b>{{ resourceGroupLabel(tradeProposer, store.game.tradeOffer.offeredResourceId) }}</b><small v-if="store.game.tradeOffer.offeredCredits">+ {{ store.game.tradeOffer.offeredCredits }} crédit(s)</small></div>
              <div><span>{{ tradeTarget?.name }} cède</span><b>{{ resourceGroupLabel(tradeTarget, store.game.tradeOffer.requestedResourceId) }}</b><small v-if="store.game.tradeOffer.requestedCredits">+ {{ store.game.tradeOffer.requestedCredits }} crédit(s)</small></div>
            </div>
            <p>Réponse attendue de {{ tradeTarget?.name }} sur son téléphone.</p>
          </div>
          <div v-else-if="revealedCard" class="card-reveal-common" :class="store.game.lastCard?.kind"><p class="eyebrow">{{ store.game.lastCard?.kind === 'trend' ? 'Tendance mondiale' : 'Nouveau levier' }}</p><h2>{{ revealedCard.title }}</h2><p>{{ revealedCard.description }}</p></div>
          <div v-if="store.game.lastRoll && !store.diceAnimation" class="dice-result"><span class="red-die" title="Dé rouge — détermine le nombre de possessions à vendre sur une Bourse">{{ store.game.lastRoll.dice[0] }}</span><span>{{ store.game.lastRoll.dice[1] }}</span><b>{{ store.game.lastRoll.total }}</b></div>
          <aside v-if="store.notifications.length" class="notification-center" aria-label="Notifications de la partie" aria-live="polite">
            <header><span>À retenir</span><button v-if="store.notifications.length > 1" type="button" @click="store.clearNotifications">Tout effacer</button></header>
            <TransitionGroup name="notification" tag="div" class="notification-stack">
              <article v-for="notification in [...store.notifications].reverse()" :key="notification.key" class="event-notification" :class="`tone-${notificationTone(notification.event.type)}`">
                <i aria-hidden="true"><GameIcon :name="notificationIcon(notification.event.type)" /></i>
                <div><small>{{ notificationLabel(notification.event.type) }}</small><p>{{ notification.event.message }}</p></div>
                <button type="button" :aria-label="`Fermer : ${notification.event.message}`" @click="store.dismissNotification(notification.key)">×</button>
              </article>
            </TransitionGroup>
          </aside>
        </section>

        <aside class="context-panel">
          <LandingNotice v-if="store.game.landedSpaceId" :game="store.game" compact />
          <div v-if="store.game.pendingPayment" class="panel payment-public">
            <span>Retombée à régler</span><b>{{ store.game.pendingPayment.amount }} crédit{{ store.game.pendingPayment.amount > 1 ? 's' : '' }}</b>
            <p>{{ store.game.players.find(player => player.id === store.game?.pendingPayment?.payerId)?.name }} doit confirmer le transfert vers {{ paymentRecipient?.name }} sur son téléphone.</p>
          </div>
          <div v-else class="panel history-panel">
            <div class="panel-heading"><span>Carnet de bord</span></div>
            <ol><li v-for="event in [...store.game.recentEvents].reverse().slice(0, 7)" :key="`${event.id}-${event.type}`">{{ event.message }}</li></ol>
          </div>
          <div class="admin-bar panel">
            <button v-if="store.game.phase === 'PAUSED'" :disabled="store.game.players.some(player => !player.connected)" @click="run(store.resumeGame)">Reprendre</button>
            <button v-else-if="store.game.phase !== 'FINISHED'" @click="run(store.pause)">Pause</button>
            <button v-if="store.game.phase !== 'FINISHED'" class="danger-link" @click="finish">Terminer</button>
          </div>
        </aside>
      </section>
    </template>

    <div v-if="store.error" class="error-toast" @click="store.error = ''">{{ store.error }}</div>
  </main>
</template>
