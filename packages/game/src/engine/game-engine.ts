import { ASSETS } from "../data/assets";
import { BOARD } from "../data/board";
import { COUNTRIES } from "../data/countries";
import { LEVER_CARDS, type LeverCard } from "../data/levers";
import { RESOURCES, type Resource } from "../data/resources";
import { TREND_CARDS, type TrendCard } from "../data/trends";
import type { Asset, AuctionState, GameEvent, GameState, PlayerState, RaceShipId, TradeOffer } from "../types";
import { nextRandom, rollDie } from "./rng";

export const STARTING_CAPITAL: Record<number, number> = { 2: 100, 3: 66, 4: 50, 5: 40, 6: 33 };
export const STARTING_RACE_SHIPS = ["inner-system", "red-belt", "giant-realms", "solar-frontier", "orion-neighborhood", "exoplanet-corridor", "stellar-farlands"] as const satisfies readonly RaceShipId[];
export const STARTING_RACE_DURATION_MS = 5_200;

export class RuleError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

const assetById = new Map<string, Asset>(ASSETS.map((asset) => [asset.id, asset]));
const leverById = new Map<string, LeverCard>(LEVER_CARDS.map((lever) => [lever.id, lever]));
const trendById = new Map<string, TrendCard>(TREND_CARDS.map((trend) => [trend.id, trend]));
const resourceById = new Map<string, Resource>(RESOURCES.map((resource) => [resource.id, resource]));
const countryById = new Map(COUNTRIES.map((country) => [country.id, country]));
const makeEvent = (state: GameState, value: Omit<GameEvent, "id">): GameEvent => ({ id: state.revision + 1, ...value });

function commit(state: GameState, events: GameEvent[]): GameState {
  return { ...state, revision: state.revision + 1, recentEvents: [...state.recentEvents, ...events].slice(-20) };
}

function requirePlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new RuleError("PLAYER_NOT_FOUND", "Joueur introuvable.");
  return player;
}

function requireActive(state: GameState, playerId: string): PlayerState {
  if (state.activePlayerId !== playerId) throw new RuleError("NOT_ACTIVE_PLAYER", "Ce n’est pas votre tour.");
  const player = requirePlayer(state, playerId);
  if (player.bankrupt) throw new RuleError("PLAYER_BANKRUPT", "Ce joueur est en faillite.");
  if (player.mergedIntoId) throw new RuleError("ALLIANCE_ASSOCIATE", "Les décisions du consortium sont prises depuis le téléphone pilote.");
  return player;
}

type BankDirection = TrendCard["bankDirection"];

function applyBankTransfer(players: PlayerState[], playerId: string, direction: BankDirection, amount: number): PlayerState[] {
  if (!Number.isFinite(amount) || amount < 0) throw new RuleError("INVALID_BANK_AMOUNT", "Le montant bancaire doit être positif.");
  const player = players.find((candidate) => candidate.id === playerId);
  if (!player) throw new RuleError("PLAYER_NOT_FOUND", "Joueur introuvable.");
  if (direction === "player_to_bank" && player.capital < amount) throw new RuleError("INSUFFICIENT_FUNDS", "Les liquidités sont insuffisantes pour payer la banque.");
  const delta = direction === "bank_to_player" ? amount : -amount;
  return players.map((candidate) => candidate.id === playerId ? { ...candidate, capital: candidate.capital + delta } : candidate);
}

function bankEventData(direction: BankDirection, amount: number): Record<string, string | number | boolean> {
  return { bankDirection: direction, amount };
}

export function createGame(id: string, code: string, seed: number): GameState {
  return {
    id, code, revision: 0, status: "LOBBY", phase: "LOBBY", previousPhase: null, pauseReason: null, pausePlayerId: null,
    players: [], activePlayerId: null, turnNumber: 0, roundNumber: 1, startingRace: { selections: {}, finishOrder: [], winnerPlayerId: null, raceEndsAt: null, pausedAt: null }, ownership: {},
    lastRoll: null, pendingAction: null, pendingLever: null, pendingPayment: null, paymentQueue: [], auction: null, tradeOffer: null,
    trendDeck: TREND_CARDS.map((card) => card.id), leverDeck: LEVER_CARDS.map((card) => card.id), lastCard: null,
    landedSpaceId: null, landedAssetId: null, recentEvents: [], rngState: seed >>> 0, winnerId: null, finishReason: null
  };
}

export function addPlayer(state: GameState, player: Pick<PlayerState, "id" | "name" | "color" | "symbol">): GameState {
  if (state.phase !== "LOBBY") throw new RuleError("GAME_ALREADY_STARTED", "La partie a déjà commencé.");
  if (state.players.length >= 6) throw new RuleError("ROOM_FULL", "La partie est complète.");
  if (state.players.some((item) => item.name.localeCompare(player.name, "fr", { sensitivity: "base" }) === 0)) throw new RuleError("NAME_TAKEN", "Ce prénom est déjà utilisé.");
  if (state.players.some((item) => item.color === player.color)) throw new RuleError("COLOR_TAKEN", "Cette couleur est déjà utilisée.");
  if (state.players.some((item) => item.symbol === player.symbol)) throw new RuleError("SYMBOL_TAKEN", "Ce symbole est déjà utilisé.");
  const nextPlayer: PlayerState = { ...player, connected: true, ready: false, position: 0, lapsCompleted: 0, turnsToSkip: 0, capital: 30, assetIds: [], leverIds: [], bankrupt: false, allianceId: null, mergedIntoId: null };
  return commit({ ...state, players: [...state.players, nextPlayer] }, [makeEvent(state, { type: "player_joined", playerId: player.id, message: `${player.name} rejoint la table.` })]);
}

export function removeLobbyPlayer(state: GameState, playerId: string): GameState {
  if (state.phase !== "LOBBY") throw new RuleError("INVALID_PHASE", "Un joueur ne peut être retiré que dans le lobby.");
  const player = requirePlayer(state, playerId);
  return commit({ ...state, players: state.players.filter((item) => item.id !== playerId) }, [
    makeEvent(state, { type: "player_left", playerId, message: `${player.name} quitte la table.` })
  ]);
}

export function setPlayerReady(state: GameState, playerId: string, ready: boolean): GameState {
  const player = requirePlayer(state, playerId);
  if (state.phase !== "LOBBY") throw new RuleError("INVALID_PHASE", "Le lobby est fermé.");
  const players = state.players.map((item) => item.id === playerId ? { ...item, ready } : item);
  return commit({ ...state, players }, [makeEvent(state, { type: "player_ready", playerId, message: `${player.name} ${ready ? "est prêt·e" : "se prépare"}.`, data: { ready } })]);
}

export function setPlayerConnected(state: GameState, playerId: string, connected: boolean): GameState {
  requirePlayer(state, playerId);
  return commit({ ...state, players: state.players.map((player) => player.id === playerId ? { ...player, connected } : player) }, []);
}

export function startGame(state: GameState): GameState {
  if (state.phase !== "LOBBY") throw new RuleError("INVALID_PHASE", "La partie est déjà lancée.");
  if (state.players.length < 2) throw new RuleError("NOT_ENOUGH_PLAYERS", "Deux joueurs sont nécessaires.");
  if (!state.players.every((player) => player.ready && player.connected)) throw new RuleError("PLAYERS_NOT_READY", "Tous les joueurs doivent être prêts et connectés.");
  const capital = STARTING_CAPITAL[state.players.length]!;
  const players = state.players.map((player) => ({ ...player, capital }));
  return commit({ ...state, players, status: "PLAYING", phase: "SHIP_SELECTION", activePlayerId: null, startingRace: { selections: {}, finishOrder: [], winnerPlayerId: null, raceEndsAt: null, pausedAt: null } }, [
    makeEvent(state, { type: "game_started", message: "Choisissez chacun un vaisseau régional. La course déterminera qui ouvrira la trajectoire.", data: { startingCapital: capital, bankDirection: "bank_to_player" } })
  ]);
}

function shuffledRaceShips(rngState: number, ships: RaceShipId[]): { order: RaceShipId[]; rngState: number } {
  const order = [...ships];
  let nextState = rngState;
  for (let index = order.length - 1; index > 0; index -= 1) {
    const [value, seed] = nextRandom(nextState);
    nextState = seed;
    const target = Math.floor(value * (index + 1));
    [order[index], order[target]] = [order[target]!, order[index]!];
  }
  return { order, rngState: nextState };
}

export function selectStartingShip(state: GameState, playerId: string, shipId: RaceShipId, now = Date.now(), raceDurationMs = STARTING_RACE_DURATION_MS): GameState {
  if (state.phase !== "SHIP_SELECTION") throw new RuleError("INVALID_PHASE", "La sélection des vaisseaux est terminée.");
  const player = requirePlayer(state, playerId);
  if (!STARTING_RACE_SHIPS.includes(shipId)) throw new RuleError("INVALID_SHIP", "Ce vaisseau n’existe pas.");
  if (state.startingRace.selections[playerId]) throw new RuleError("SHIP_ALREADY_SELECTED", "Votre vaisseau est déjà confirmé.");
  if (Object.values(state.startingRace.selections).includes(shipId)) throw new RuleError("SHIP_TAKEN", "Ce vaisseau vient d’être choisi.");
  const selections = { ...state.startingRace.selections, [playerId]: shipId };
  const selectionEvent = makeEvent(state, { type: "ship_selected", playerId, message: `${player.name} a verrouillé son vaisseau.`, data: { shipId } });
  if (Object.keys(selections).length < state.players.length) {
    return commit({ ...state, startingRace: { ...state.startingRace, selections } }, [selectionEvent]);
  }
  const selectedShips = Object.values(selections) as RaceShipId[];
  const race = shuffledRaceShips(state.rngState, selectedShips);
  const playerByShip = new Map(Object.entries(selections).map(([id, selectedShip]) => [selectedShip, id]));
  const winnerShipId = race.order.find((id) => playerByShip.has(id))!;
  const winnerPlayerId = playerByShip.get(winnerShipId)!;
  return commit({ ...state, phase: "SHIP_RACE", rngState: race.rngState, startingRace: { selections, finishOrder: race.order, winnerPlayerId, raceEndsAt: now + raceDurationMs, pausedAt: null } }, [
    selectionEvent,
    makeEvent(state, { type: "ship_race_started", message: `Les ${race.order.length} vaisseaux choisis s’élancent vers la balise de départ.` })
  ]);
}

export function finishStartingRace(state: GameState): GameState {
  if (state.phase !== "SHIP_RACE" || !state.startingRace.winnerPlayerId) throw new RuleError("INVALID_PHASE", "Aucune course n’attend sa conclusion.");
  const first = requirePlayer(state, state.startingRace.winnerPlayerId);
  const winnerShipId = state.startingRace.selections[first.id]!;
  return commit({ ...state, phase: "WAITING_FOR_ROLL", activePlayerId: first.id }, [
    makeEvent(state, { type: "ship_race_finished", playerId: first.id, message: `${first.name} possède le vaisseau choisi le mieux classé et ouvrira la trajectoire.`, data: { winnerShipId } }),
    makeEvent(state, { type: "turn_started", playerId: first.id, message: `Tour de ${first.name}.` })
  ]);
}

export function getCurrentPrice(state: GameState, asset: Asset): number {
  return asset.basePrice;
}

export function getNetWorth(state: GameState, playerId: string): number {
  const player = requirePlayer(state, playerId);
  return player.capital + player.assetIds.reduce((total, assetId) => total + getCurrentPrice(state, assetById.get(assetId)!), 0);
}

export function getResourceInfluence(state: GameState, playerId: string, resourceId: string): number {
  return requirePlayer(state, playerId).assetIds.reduce((total, assetId) => {
    const asset = assetById.get(assetId);
    return total + (asset?.resourceId === resourceId ? asset.share : 0);
  }, 0);
}

export function getPaymentAmount(state: GameState, asset: Asset, ownerId: string): number {
  const influence = getResourceInfluence(state, ownerId, asset.resourceId);
  return getRoyaltyAmount(asset.resourceId, influence);
}

export function getRoyaltyAmount(resourceId: string, sharePercent: number): number {
  const royalties = resourceById.get(resourceId)?.royalties;
  if (!royalties) throw new RuleError("RESOURCE_NOT_FOUND", "Ressource cosmique introuvable.");
  if (sharePercent >= 90) return royalties[90];
  if (sharePercent >= 70) return royalties[70];
  if (sharePercent >= 50) return royalties[50];
  if (sharePercent >= 30) return royalties[30];
  return 0;
}

function drawId(rngState: number, deck: string[], allIds: string[]): { id: string; deck: string[]; rngState: number } {
  const available = deck.length ? deck : [...allIds];
  const [value, nextState] = nextRandom(rngState);
  const index = Math.min(available.length - 1, Math.floor(value * available.length));
  return { id: available[index]!, deck: available.filter((_, itemIndex) => itemIndex !== index), rngState: nextState };
}

function applyTrend(state: GameState, playerId: string): { state: GameState; event: GameEvent; bankDebt: number } {
  const drawn = drawId(state.rngState, state.trendDeck, TREND_CARDS.map((card) => card.id));
  const card = trendById.get(drawn.id)!;
  const player = requirePlayer(state, playerId);
  const cannotPay = card.bankDirection === "player_to_bank" && player.capital < card.amount;
  const players = cannotPay ? state.players : applyBankTransfer(state.players, playerId, card.bankDirection, card.amount);
  const next = { ...state, players, trendDeck: drawn.deck, rngState: drawn.rngState, lastCard: { kind: "trend" as const, id: card.id } };
  return {
    state: next,
    event: makeEvent(state, {
      type: "trend_drawn",
      playerId,
      message: `Événement cosmique — ${card.title} : ${card.description}`,
      data: { cardId: card.id, ...bankEventData(card.bankDirection, card.amount), appliedAmount: cannotPay ? 0 : card.amount, shortfall: cannotPay ? card.amount - player.capital : 0 }
    }),
    bankDebt: cannotPay ? card.amount : 0
  };
}

function offerLever(state: GameState, playerId: string): { state: GameState; event: GameEvent } {
  const player = requirePlayer(state, playerId);
  if (state.players.filter((candidate) => !candidate.bankrupt && !candidate.mergedIntoId).length <= 2) {
    return {
      state,
      event: makeEvent(state, {
        type: "lever_passed",
        playerId,
        message: `${player.name} arrive sur une Station technologique, devenue case de repos puisqu’il ne reste que deux joueurs.`
      })
    };
  }
  if (!state.leverDeck.length) {
    return { state, event: makeEvent(state, { type: "lever_passed", playerId, message: `${player.name} ne trouve plus aucune Technologie disponible sur cette Station.` }) };
  }
  const leverId = state.leverDeck[0]!;
  const price = 3;
  return { state: { ...state, phase: "WAITING_FOR_LEVER_PURCHASE", pendingLever: { playerId, leverId, price } }, event: makeEvent(state, { type: "lever_offered", playerId, message: `${player.name} peut acheter une Technologie d’évasion pour ${price} crédits.`, data: { leverId, price } }) };
}

function startAuction(state: GameState, playerId: string, redDie: number): { state: GameState; event: GameEvent } {
  const seller = requirePlayer(state, playerId);
  const availablePlayers = state.players.filter((player) => !player.bankrupt && !player.mergedIntoId && player.connected);
  if (availablePlayers.length <= 2) return { state, event: makeEvent(state, { type: "auction_passed", playerId, message: `${seller.name} arrive sur un Marché orbital, devenu case de repos puisqu’il ne reste que deux joueurs disponibles.` }) };
  if (seller.lapsCompleted < 1) return { state, event: makeEvent(state, { type: "auction_passed", playerId, message: `${seller.name} n’a pas encore accompli un tour complet : le Marché orbital est une case de repos.` }) };
  if (!seller.assetIds.length) return { state, event: makeEvent(state, { type: "auction_passed", playerId, message: `${seller.name} ne possède aucune concession à mettre en vente.` }) };
  const targetCount = Math.min(redDie, seller.assetIds.length);
  const auction: AuctionState = {
    mode: "selection", sellerId: playerId, bankSale: false, targetCount, redDie, assetId: seller.assetIds[0]!, selectedAssetIds: [], lots: [], currentLotIndex: 0,
    minimumBid: 0, currentBid: 0, leaderId: null,
    eligiblePlayerIds: availablePlayers.filter((player) => player.id !== playerId && player.capital > 0).map((player) => player.id), passedPlayerIds: [], deadline: null
  };
  return { state: { ...state, phase: "AUCTION", auction }, event: makeEvent(state, { type: "auction_started", playerId, message: `${seller.name} doit proposer ${targetCount} concession${targetCount > 1 ? "s" : ""} au Marché orbital, selon le dé rouge (${redDie}).`, data: { redDie, targetCount } }) };
}

function continueAfterRoyalties(state: GameState, events: GameEvent[]): GameState {
  const pending = state.pendingAction;
  if (!pending) return { ...state, phase: "WAITING_FOR_END_TURN" };
  const player = requirePlayer(state, pending.playerId);
  events.push(makeEvent(state, {
    type: "purchase_offered",
    playerId: pending.playerId,
    message: `${player.name} peut maintenant acheter jusqu’à ${pending.maxAssets} concessions encore disponibles dans le registre de ${pending.label}.`,
    data: { source: pending.source, ...(pending.countryId ? { countryId: pending.countryId, worldId: pending.countryId } : {}), ...(pending.resourceId ? { resourceId: pending.resourceId } : {}), availableCount: pending.availableAssetIds.length }
  }));
  return { ...state, phase: "WAITING_FOR_PURCHASE" };
}

function beginRoyalties(state: GameState, payerId: string, resourceId: string, events: GameEvent[]): GameState {
  const payer = requirePlayer(state, payerId);
  const resource = resourceById.get(resourceId)!;
  const payments = state.players
    .filter((player) => player.id !== payerId && !player.bankrupt && !player.mergedIntoId)
    .map((player) => {
      const assetId = player.assetIds.find((id) => assetById.get(id)?.resourceId === resourceId);
      if (!assetId) return null;
      const amount = getPaymentAmount(state, assetById.get(assetId)!, player.id);
      return amount >= 1 ? { type: "payment" as const, payerId, recipientId: player.id, assetId, resourceId, amount } : null;
    })
    .filter((payment): payment is NonNullable<typeof payment> => payment !== null);
  const [pendingPayment, ...paymentQueue] = payments;
  if (!pendingPayment) {
    events.push(makeEvent(state, { type: "asset_visited", playerId: payerId, message: `${resource.name} : aucun autre joueur ne détient les 30 % requis pour recevoir des droits d’extraction.`, data: { resourceId } }));
    return continueAfterRoyalties({ ...state, pendingPayment: null, paymentQueue: [] }, events);
  }
  const recipient = requirePlayer(state, pendingPayment.recipientId);
  events.push(makeEvent(state, { type: "payment_due", playerId: payerId, message: `${payer.name} doit verser ${pendingPayment.amount} crédit${pendingPayment.amount > 1 ? "s" : ""} à ${recipient.name} pour ${resource.name}.`, data: { payerId, recipientId: recipient.id, amount: pendingPayment.amount, resourceId } }));
  return { ...state, pendingPayment, paymentQueue, phase: "WAITING_FOR_PAYMENT" };
}

function offerSpecialPurchase(state: GameState, playerId: string, source: "regional" | "global", label: string, continents: string[] | null, events: GameEvent[]): GameState {
  const player = requirePlayer(state, playerId);
  if (source === "global" && player.lapsCompleted < 1) {
    events.push(makeEvent(state, { type: "purchase_passed", playerId, message: `${label} ne s’active qu’après un tour complet du plateau.` }));
    return { ...state, phase: "WAITING_FOR_END_TURN" };
  }
  const ownedResources = new Set(player.assetIds.map((assetId) => assetById.get(assetId)!.resourceId));
  const availableAssetIds = ASSETS.filter((asset) => {
    if (state.ownership[asset.id] || !ownedResources.has(asset.resourceId)) return false;
    return !continents || continents.includes(countryById.get(asset.countryId)!.continent);
  }).map((asset) => asset.id);
  if (!ownedResources.size) {
    events.push(makeEvent(state, { type: "purchase_passed", playerId, message: `${player.name} ne possède encore aucune ressource à compléter sur ${label}.` }));
    return { ...state, phase: "WAITING_FOR_END_TURN" };
  }
  if (!availableAssetIds.length) {
    events.push(makeEvent(state, { type: "purchase_passed", playerId, message: `Aucune concession admissible n’est encore disponible sur ${label}.` }));
    return { ...state, phase: "WAITING_FOR_END_TURN" };
  }
  events.push(makeEvent(state, { type: "purchase_offered", playerId, message: `${player.name} peut acheter jusqu’à 6 concessions de ressources déjà présentes dans son portefeuille sur ${label}.`, data: { source, availableCount: availableAssetIds.length } }));
  return {
    ...state,
    phase: "WAITING_FOR_PURCHASE",
    pendingAction: { type: "purchase", source, playerId, countryId: null, resourceId: null, label, availableAssetIds, maxAssets: 6 }
  };
}

export function rollDice(state: GameState, playerId: string): GameState {
  const player = requireActive(state, playerId);
  if (state.phase !== "WAITING_FOR_ROLL") throw new RuleError("INVALID_PHASE", "Les dés ne peuvent pas être lancés maintenant.");
  const [first, seedOne] = rollDie(state.rngState);
  const [second, seedTwo] = rollDie(seedOne);
  const total = first + second;
  const doubleTax = first === second ? first : 0;
  const diceEvent = makeEvent(state, { type: "dice_rolled", playerId, message: `${player.name} obtient ${total}.`, data: { first, second, total } });
  if (doubleTax && player.capital < doubleTax) {
    const taxEvent = makeEvent(state, {
      type: "double_tax_paid",
      playerId,
      message: `${player.name} a obtenu un double ${first}, mais ne peut pas verser ${doubleTax} crédits à la banque.`,
      data: { ...bankEventData("player_to_bank", doubleTax), die: first, appliedAmount: 0, shortfall: doubleTax - player.capital }
    });
    const failedState: GameState = { ...state, rngState: seedTwo, lastRoll: { dice: [first, second], total } };
    return settleBankruptcy(failedState, playerId, [{ recipientId: null, amount: doubleTax }], [diceEvent, taxEvent]);
  }
  const debitedPlayers = doubleTax ? applyBankTransfer(state.players, playerId, "player_to_bank", doubleTax) : state.players;
  const position = (player.position + total) % BOARD.length;
  const completedLap = player.position + total >= BOARD.length;
  const movedPlayers = debitedPlayers.map((item) => item.id === playerId ? { ...item, position, lapsCompleted: item.lapsCompleted + (completedLap ? 1 : 0) } : item);
  const space = BOARD[position]!;
  const events: GameEvent[] = [
    diceEvent,
    ...(doubleTax ? [makeEvent(state, { type: "double_tax_paid" as const, playerId, message: `${player.name} a obtenu un double ${first} et verse ${doubleTax} crédit${doubleTax > 1 ? "s" : ""} à la banque.`, data: { ...bankEventData("player_to_bank", doubleTax), die: first, appliedAmount: doubleTax, shortfall: 0 } })] : []),
    makeEvent(state, { type: "pawn_moved", playerId, message: `${player.name} avance de ${total} étapes.`, data: { from: player.position, to: position, steps: total } }),
    makeEvent(state, { type: "space_landed", playerId, message: space.type === "asset" ? (() => { const title = assetById.get(space.assetId)!; return `${player.name} arrive sur la case ${title.hub} · ${resourceById.get(title.resourceId)!.name}.`; })() : `${player.name} arrive sur ${space.name}${space.type === "hub" ? " : case de transit, aucun effet." : "."}`, data: { spaceId: space.id, spaceType: space.type, ...(space.type === "asset" ? { assetId: space.assetId } : {}), ...(space.type === "special" ? { specialKind: space.kind } : {}) } })
  ];
  let next: GameState = { ...state, players: movedPlayers, rngState: seedTwo, lastRoll: { dice: [first, second], total }, phase: "WAITING_FOR_END_TURN", pendingAction: null, pendingLever: null, pendingPayment: null, paymentQueue: [], auction: null, lastCard: null, landedSpaceId: space.id, landedAssetId: space.type === "asset" ? space.assetId : null };

  if (space.type === "asset") {
    const featured = assetById.get(space.assetId)!;
    const resource = resourceById.get(featured.resourceId)!;
    const availableAssetIds = ASSETS.filter((asset) => asset.countryId === featured.countryId && !state.ownership[asset.id]).map((asset) => asset.id);
    events.push(makeEvent(state, { type: "asset_visited", playerId, message: `Case ${featured.hub} · ${resource.name} : droits d’extraction de la ressource, puis achats dans le registre du monde.`, data: { countryId: featured.countryId, worldId: featured.worldId, resourceId: featured.resourceId } }));
    if (availableAssetIds.length) {
      next = { ...next, pendingAction: { type: "purchase", source: "classic", playerId, countryId: featured.countryId, resourceId: featured.resourceId, label: featured.hub, availableAssetIds, maxAssets: 6 } };
    }
    next = beginRoyalties(next, playerId, featured.resourceId, events);
  } else if (space.type === "special" && space.kind === "trend") {
    const result = applyTrend(next, playerId); next = result.state; events.push(result.event);
    if (result.bankDebt) return settleBankruptcy(next, playerId, [{ recipientId: null, amount: result.bankDebt }], events);
  } else if (space.type === "special" && space.kind === "joker") {
    const result = offerLever(next, playerId); next = result.state; events.push(result.event);
  } else if (space.type === "special" && space.kind === "auction") {
    const result = startAuction(next, playerId, first); next = result.state; events.push(result.event);
  } else if (space.type === "special" && space.kind === "dividend") {
    const amount = total * 0.5;
    next = { ...next, players: applyBankTransfer(next.players, playerId, "bank_to_player", amount) };
    events.push(makeEvent(state, { type: "dividend_received", playerId, message: `${player.name} reçoit une prime d’expédition de ${amount} crédits de la Banque interstellaire (${total} × 0,5), puis règle les droits d’extraction de ${resourceById.get(space.resourceId)!.name}.`, data: { ...bankEventData("bank_to_player", amount), total, resourceId: space.resourceId } }));
    next = beginRoyalties(next, playerId, space.resourceId, events);
  } else if (space.type === "special" && space.kind === "regional_choice") {
    next = offerSpecialPurchase(next, playerId, "regional", space.regionName, space.continents, events);
  } else if (space.type === "special" && space.kind === "global_choice") {
    next = offerSpecialPurchase(next, playerId, "global", space.name, null, events);
  } else if (space.type === "special" && space.kind === "customs") {
    next = { ...next, players: next.players.map((candidate) => candidate.id === playerId ? { ...candidate, turnsToSkip: candidate.turnsToSkip + 1 } : candidate) };
    events.push(makeEvent(state, { type: "customs_applied", playerId, message: `${player.name} est placé en quarantaine orbitale et passera son prochain tour.`, data: { turnsToSkip: 1 } }));
  }
  return commit(next, events);
}

export function buyPendingAsset(state: GameState, playerId: string, assetIds?: string[]): GameState {
  const player = requireActive(state, playerId);
  const pending = state.pendingAction;
  if (state.phase !== "WAITING_FOR_PURCHASE" || !pending || pending.playerId !== playerId) throw new RuleError("INVALID_PHASE", "Aucun achat n’est proposé.");
  const selected = [...new Set(assetIds?.length ? assetIds : [pending.availableAssetIds[0]!])];
  if (!selected.length || selected.length > pending.maxAssets || !selected.every((id) => pending.availableAssetIds.includes(id) && !state.ownership[id])) throw new RuleError("INVALID_PURCHASE", "Sélection de concessions invalide.");
  const price = selected.reduce((total, id) => total + assetById.get(id)!.basePrice, 0);
  if (player.capital < price) throw new RuleError("INSUFFICIENT_FUNDS", "Capital insuffisant pour cette sélection.");
  const debitedPlayers = applyBankTransfer(state.players, playerId, "player_to_bank", price);
  const players = debitedPlayers.map((item) => item.id === playerId ? { ...item, assetIds: [...item.assetIds, ...selected] } : item);
  const ownership = { ...state.ownership }; selected.forEach((id) => { ownership[id] = playerId; });
  const events = [makeEvent(state, { type: "asset_purchased", playerId, message: `${player.name} achète ${selected.length} concession${selected.length > 1 ? "s" : ""} pour ${price} crédits stellaires.`, data: { source: pending.source, assetCount: selected.length, price, ...bankEventData("player_to_bank", price), ...(pending.countryId ? { worldId: pending.countryId } : {}), ...(pending.resourceId ? { resourceId: pending.resourceId } : {}) } })];
  const purchasedState = { ...state, players, ownership, pendingAction: null };
  return commit({ ...purchasedState, phase: "WAITING_FOR_END_TURN" }, events);
}

export function passPendingAsset(state: GameState, playerId: string): GameState {
  const player = requireActive(state, playerId);
  const pending = state.pendingAction;
  if (state.phase !== "WAITING_FOR_PURCHASE" || !pending || pending.playerId !== playerId) throw new RuleError("INVALID_PHASE", "Aucun achat n’est proposé.");
  const events = [makeEvent(state, { type: "purchase_passed", playerId, message: `${player.name} n’achète aucune concession sur ${pending.label}.`, data: { source: pending.source, ...(pending.countryId ? { worldId: pending.countryId } : {}), ...(pending.resourceId ? { resourceId: pending.resourceId } : {}) } })];
  const passedState = { ...state, pendingAction: null };
  return commit({ ...passedState, phase: "WAITING_FOR_END_TURN" }, events);
}

export function buyPendingLever(state: GameState, playerId: string): GameState {
  const player = requireActive(state, playerId); const pending = state.pendingLever;
  if (state.phase !== "WAITING_FOR_LEVER_PURCHASE" || !pending || pending.playerId !== playerId) throw new RuleError("INVALID_PHASE", "Aucune Technologie n’est proposée.");
  if (player.capital < pending.price) throw new RuleError("INSUFFICIENT_FUNDS", "Crédits insuffisants pour acheter cette Technologie.");
  const card = leverById.get(pending.leverId)!;
  const debitedPlayers = applyBankTransfer(state.players, playerId, "player_to_bank", pending.price);
  const players = debitedPlayers.map((item) => item.id === playerId ? { ...item, leverIds: [...item.leverIds, pending.leverId] } : item);
  return commit({ ...state, players, leverDeck: state.leverDeck.filter((id) => id !== pending.leverId), pendingLever: null, lastCard: { kind: "lever", id: pending.leverId }, phase: "WAITING_FOR_END_TURN" }, [makeEvent(state, { type: "lever_drawn", playerId, message: `${player.name} achète « ${card.title} » pour ${pending.price} crédits.`, data: { leverId: card.id, price: pending.price, ...bankEventData("player_to_bank", pending.price) } })]);
}

export function passPendingLever(state: GameState, playerId: string): GameState {
  const player = requireActive(state, playerId); const pending = state.pendingLever;
  if (state.phase !== "WAITING_FOR_LEVER_PURCHASE" || !pending || pending.playerId !== playerId) throw new RuleError("INVALID_PHASE", "Aucune Technologie n’est proposée.");
  return commit({ ...state, pendingLever: null, phase: "WAITING_FOR_END_TURN" }, [makeEvent(state, { type: "lever_passed", playerId, message: `${player.name} renonce à la Technologie proposée.` })]);
}

export function payPendingPayment(state: GameState, playerId: string): GameState {
  const payer = requireActive(state, playerId);
  const pending = state.pendingPayment;
  if (state.phase !== "WAITING_FOR_PAYMENT" || !pending || pending.payerId !== playerId) throw new RuleError("INVALID_PHASE", "Aucun droit d’extraction n’est à régler.");
  if (payer.capital < pending.amount) throw new RuleError("INSUFFICIENT_FUNDS", "Vos liquidités sont insuffisantes : la faillite doit être déclarée.");
  const recipient = requirePlayer(state, pending.recipientId);
  const resource = resourceById.get(pending.resourceId)!;
  const players = state.players.map((item) => item.id === payer.id ? { ...item, capital: item.capital - pending.amount } : item.id === recipient.id ? { ...item, capital: item.capital + pending.amount } : item);
  const events = [makeEvent(state, { type: "payment_completed", playerId, message: `${payer.name} verse ${pending.amount} crédit${pending.amount > 1 ? "s" : ""} à ${recipient.name} pour ${resource.name}.`, data: { assetId: pending.assetId, resourceId: pending.resourceId, payerId: playerId, recipientId: recipient.id, amount: pending.amount, due: pending.amount, shortfall: 0 } })];
  const [nextPayment, ...paymentQueue] = state.paymentQueue;
  if (!nextPayment) return commit(continueAfterRoyalties({ ...state, players, pendingPayment: null, paymentQueue: [] }, events), events);
  const nextRecipient = requirePlayer(state, nextPayment.recipientId);
  events.push(makeEvent(state, { type: "payment_due", playerId, message: `${payer.name} doit maintenant verser ${nextPayment.amount} crédit${nextPayment.amount > 1 ? "s" : ""} à ${nextRecipient.name} pour ${resource.name}.`, data: { payerId: playerId, recipientId: nextRecipient.id, amount: nextPayment.amount, resourceId: pending.resourceId } }));
  return commit({ ...state, players, pendingPayment: nextPayment, paymentQueue, phase: "WAITING_FOR_PAYMENT" }, events);
}

export function useLever(state: GameState, playerId: string, leverId: string): GameState {
  const player = requireActive(state, playerId);
  if (!player.leverIds.includes(leverId)) throw new RuleError("LEVER_NOT_OWNED", "Ce levier n’est pas dans votre main.");
  const lever = leverById.get(leverId);
  if (!lever) throw new RuleError("LEVER_NOT_FOUND", "Levier introuvable.");
  if (state.phase !== "AUCTION" || state.auction?.mode !== "selection" || state.auction.sellerId !== playerId) throw new RuleError("INVALID_PHASE", "Cette Technologie s’utilise uniquement avant de sélectionner les lots à vendre.");
  const next: GameState = {
    ...state,
    players: state.players.map((item) => item.id === playerId ? { ...item, leverIds: item.leverIds.filter((id) => id !== leverId) } : item),
    leverDeck: [...state.leverDeck, leverId],
    auction: null,
    phase: "WAITING_FOR_END_TURN"
  };
  return commit(next, [makeEvent(state, { type: "lever_used", playerId, message: `${player.name} active « ${lever.title} ».`, data: { leverId, kind: lever.kind } })]);
}

function winner(state: GameState): PlayerState | null {
  return [...state.players].filter((player) => !player.bankrupt && !player.mergedIntoId).sort((a, b) => getNetWorth(state, b.id) - getNetWorth(state, a.id) || b.capital - a.capital)[0] ?? null;
}

function finishWithReason(state: GameState, reason: GameState["finishReason"], events: GameEvent[]): GameState {
  // A manually stopped game is not a victory condition. Only the final
  // solvent consortium wins; an administrative stop must not turn the
  // current wealth ranking into a winner.
  const winningPlayer = reason === "LAST_SOLVENT" ? winner(state) : null;
  return commit({ ...state, status: "FINISHED", phase: "FINISHED", previousPhase: null, pauseReason: null, pausePlayerId: null, pendingAction: null, pendingLever: null, pendingPayment: null, paymentQueue: [], auction: null, tradeOffer: null, winnerId: winningPlayer?.id ?? null, finishReason: reason }, [
    ...events,
    makeEvent(state, { type: "game_finished", ...(winningPlayer ? { playerId: winningPlayer.id } : {}), message: reason === "LAST_SOLVENT" && winningPlayer ? `${winningPlayer.name} est le dernier consortium opérationnel et remporte la partie.` : "La partie a été arrêtée par l’hôte." })
  ]);
}

function nextPlayable(state: GameState, playerId: string): { player: PlayerState; players: PlayerState[]; wrapped: boolean; skipped: PlayerState[] } {
  let cursor = state.players.findIndex((item) => item.id === playerId);
  let players = state.players;
  let wrapped = false;
  const skipped: PlayerState[] = [];
  for (let attempt = 0; attempt < state.players.length * 2; attempt += 1) {
    const index = (cursor + 1) % state.players.length;
    if (index === 0) wrapped = true;
    const candidate = players[index]!;
    cursor = index;
    if (candidate.bankrupt || candidate.mergedIntoId) continue;
    if (candidate.turnsToSkip > 0) {
      skipped.push(candidate);
      players = players.map((item) => item.id === candidate.id ? { ...item, turnsToSkip: item.turnsToSkip - 1 } : item);
      continue;
    }
    return { player: candidate, players, wrapped, skipped };
  }
  throw new RuleError("NO_PLAYABLE_PLAYER", "Aucun joueur ne peut commencer le prochain tour.");
}

type BankruptcyDebt = { recipientId: string | null; amount: number };

function settleBankruptcy(state: GameState, playerId: string, debts: BankruptcyDebt[], precedingEvents: GameEvent[]): GameState {
  const player = requireActive(state, playerId);
  const debtByRecipient = new Map<string, number>();
  for (const debt of debts) {
    if (!Number.isFinite(debt.amount) || debt.amount <= 0) throw new RuleError("INVALID_BANKRUPTCY_DEBT", "Une dette de faillite doit être positive.");
    if (debt.recipientId) debtByRecipient.set(debt.recipientId, (debtByRecipient.get(debt.recipientId) ?? 0) + debt.amount);
  }
  const eliminatedIds = new Set(state.players.filter((item) => item.id === playerId || (player.allianceId && item.allianceId === player.allianceId)).map(({ id }) => id));
  let players = state.players.map((item) => eliminatedIds.has(item.id) ? { ...item, capital: 0, assetIds: [], bankrupt: true } : item);
  for (const [recipientId, amount] of debtByRecipient) players = applyBankTransfer(players, recipientId, "bank_to_player", amount);
  const ownership = { ...state.ownership };
  player.assetIds.forEach((assetId) => { delete ownership[assetId]; });
  const totalDebt = debts.reduce((total, debt) => total + debt.amount, 0);
  const creditorCompensation = [...debtByRecipient.values()].reduce((total, amount) => total + amount, 0);
  const debtToBank = totalDebt - creditorCompensation;
  const base: GameState = { ...state, players, ownership, pendingAction: null, pendingPayment: null, paymentQueue: [], landedSpaceId: null, landedAssetId: null };
  const bankruptcyEvent = makeEvent(state, {
    type: "player_bankrupt",
    playerId,
    message: `${player.name} perd sa licence galactique avec ${totalDebt} crédit${totalDebt > 1 ? "s" : ""} de dettes. La Banque interstellaire reprend ses concessions${creditorCompensation ? ` et verse ${creditorCompensation} crédits aux créanciers` : ""}.`,
    data: { amount: totalDebt, creditorCompensation, debtToBank, assetCount: player.assetIds.length }
  });
  const events = [...precedingEvents, bankruptcyEvent];
  if (players.filter((item) => !item.bankrupt && !item.mergedIntoId).length === 1) return finishWithReason(base, "LAST_SOLVENT", events);
  if (player.assetIds.length) {
    const lots = RESOURCES.map((resource) => player.assetIds.filter((assetId) => assetById.get(assetId)?.resourceId === resource.id)).filter((lot) => lot.length);
    const auction = prepareAuctionLot({
      mode: "bidding", sellerId: playerId, bankSale: true, targetCount: player.assetIds.length, redDie: 0,
      assetId: lots[0]![0]!, selectedAssetIds: [...player.assetIds], lots, currentLotIndex: 0,
      minimumBid: 0, currentBid: 0, leaderId: null,
      eligiblePlayerIds: players.filter((item) => !item.bankrupt && !item.mergedIntoId).map((item) => item.id), passedPlayerIds: [], deadline: null
    }, 0);
    return commit({ ...base, phase: "AUCTION", auction }, [...events, makeEvent(state, { type: "auction_started", message: `La Banque interstellaire ouvre le Marché orbital pour les concessions de ${player.name}. Premier lot à ${auction.minimumBid} crédits pendant 10 secondes.`, data: { assetCount: player.assetIds.length, minimumBid: auction.minimumBid } })]);
  }
  const next = nextPlayable(base, playerId);
  events.push(...next.skipped.map((skipped) => makeEvent(state, { type: "turn_skipped" as const, playerId: skipped.id, message: `${skipped.name} passe ce tour à la suite d’une quarantaine orbitale.` })));
  events.push(makeEvent(state, { type: "turn_started", playerId: next.player.id, message: `Tour de ${next.player.name}.` }));
  const nextPhase = next.player.connected ? "WAITING_FOR_ROLL" : "PAUSED";
  if (!next.player.connected) events.push(makeEvent(state, { type: "game_paused", playerId: next.player.id, message: `La partie est en pause : ${next.player.name} doit se reconnecter avant son tour.` }));
  return commit({ ...base, players: next.players, phase: nextPhase, previousPhase: next.player.connected ? null : "WAITING_FOR_ROLL", pauseReason: next.player.connected ? null : "PLAYER_DISCONNECTED", pausePlayerId: next.player.connected ? null : next.player.id, activePlayerId: next.player.id, turnNumber: state.turnNumber + 1 + next.skipped.length, roundNumber: state.roundNumber + (next.wrapped ? 1 : 0), lastRoll: null }, events);
}

export function declareBankruptcy(state: GameState, playerId: string): GameState {
  const player = requireActive(state, playerId);
  const pending = state.pendingPayment;
  if (state.phase !== "WAITING_FOR_PAYMENT" || pending?.payerId !== playerId || player.capital >= pending.amount) throw new RuleError("BANKRUPTCY_NOT_ALLOWED", "La faillite n’est possible que si la dette dépasse les liquidités disponibles.");
  const debts = [pending, ...state.paymentQueue].map((debt) => ({ recipientId: debt.recipientId, amount: debt.amount }));
  return settleBankruptcy(state, playerId, debts, []);
}

function auctionMinimum(lot: string[]): number {
  return Math.max(0.5, lot.reduce((total, assetId) => total + assetById.get(assetId)!.basePrice, 0) / 2);
}

function prepareAuctionLot(auction: AuctionState, index: number): AuctionState {
  const lot = auction.lots[index]!;
  return { ...auction, mode: "bidding", currentLotIndex: index, assetId: lot[0]!, minimumBid: auctionMinimum(lot), currentBid: 0, leaderId: null, passedPlayerIds: [], deadline: Date.now() + 10_000 };
}

export function selectAuctionAssets(state: GameState, playerId: string, assetIds: string[]): GameState {
  const seller = requireActive(state, playerId); const auction = state.auction;
  if (state.phase !== "AUCTION" || !auction || auction.mode !== "selection" || auction.sellerId !== playerId) throw new RuleError("AUCTION_SELECTION_NOT_ALLOWED", "Aucune sélection de vente n’est attendue.");
  const unique = [...new Set(assetIds)];
  if (!unique.every((assetId) => seller.assetIds.includes(assetId))) throw new RuleError("ASSET_NOT_OWNED", "Une concession sélectionnée ne vous appartient pas.");
  const selectedGroupSizes: number[] = [];
  for (const resource of RESOURCES) {
    const owned = seller.assetIds.filter((assetId) => assetById.get(assetId)!.resourceId === resource.id);
    const selected = unique.filter((assetId) => assetById.get(assetId)!.resourceId === resource.id);
    if (selected.length && selected.length !== owned.length) throw new RuleError("RESOURCE_GROUP_MUST_STAY_TOGETHER", `Toutes les concessions de ${resource.name} doivent être vendues ensemble.`);
    if (selected.length) selectedGroupSizes.push(selected.length);
  }
  if (unique.length < auction.targetCount) throw new RuleError("INVALID_AUCTION_SELECTION", `Sélectionnez au moins ${auction.targetCount} concessions.`);
  if (selectedGroupSizes.some((size) => unique.length - size >= auction.targetCount)) throw new RuleError("INVALID_AUCTION_SELECTION", "La sélection contient un groupe de ressource superflu.");
  const lots: string[][] = [];
  for (const resource of RESOURCES) {
    const grouped = unique.filter((assetId) => assetById.get(assetId)!.resourceId === resource.id);
    if (grouped.length) lots.push(grouped);
  }
  const prepared = prepareAuctionLot({ ...auction, selectedAssetIds: unique, lots }, 0);
  const names = unique.map((assetId) => assetById.get(assetId)!.name).join(", ");
  const next = { ...state, auction: prepared };
  if (!prepared.eligiblePlayerIds.length) return closeAuctionLot(next, [makeEvent(state, { type: "auction_passed", playerId, message: `Aucun acheteur n’est admissible. La banque reprend le premier lot à moitié prix.` })]);
  return commit(next, [makeEvent(state, { type: "auction_started", playerId, message: `${seller.name} met en vente : ${names}. Première mise à ${prepared.minimumBid} crédits.`, data: { targetCount: unique.length, minimumBid: prepared.minimumBid } })]);
}

function closeAuctionLot(state: GameState, events: GameEvent[] = []): GameState {
  const auction = state.auction;
  if (state.phase !== "AUCTION" || !auction || auction.mode !== "bidding") throw new RuleError("INVALID_PHASE", "Aucun lot n’est à adjuger.");
  const lot = auction.lots[auction.currentLotIndex]!; const seller = requirePlayer(state, auction.sellerId);
  const ownership = { ...state.ownership };
  let players = state.players;
  if (auction.leaderId) {
    const buyer = requirePlayer(state, auction.leaderId);
    if (auction.bankSale) {
      const debitedPlayers = applyBankTransfer(players, buyer.id, "player_to_bank", auction.currentBid);
      players = debitedPlayers.map((player) => player.id === buyer.id ? { ...player, assetIds: [...player.assetIds, ...lot] } : player);
    } else {
      players = players.map((player) => player.id === buyer.id ? { ...player, capital: player.capital - auction.currentBid, assetIds: [...player.assetIds, ...lot] } : player.id === seller.id ? { ...player, capital: player.capital + auction.currentBid, assetIds: player.assetIds.filter((id) => !lot.includes(id)) } : player);
    }
    lot.forEach((assetId) => { ownership[assetId] = buyer.id; });
    events.push(makeEvent(state, { type: "auction_won", playerId: buyer.id, message: `${buyer.name} remporte ${lot.map((id) => assetById.get(id)!.name).join(" + ")} pour ${auction.currentBid} crédits${auction.bankSale ? " versés à la banque" : ` versés à ${seller.name}`}.`, data: { amount: auction.currentBid, sellerId: seller.id, assetCount: lot.length, ...(auction.bankSale ? bankEventData("player_to_bank", auction.currentBid) : {}) } }));
  } else {
    if (!auction.bankSale) {
      const creditedPlayers = applyBankTransfer(players, seller.id, "bank_to_player", auction.minimumBid);
      players = creditedPlayers.map((player) => player.id === seller.id ? { ...player, assetIds: player.assetIds.filter((id) => !lot.includes(id)) } : player);
    }
    lot.forEach((assetId) => { delete ownership[assetId]; });
    events.push(makeEvent(state, { type: "auction_passed", playerId: seller.id, message: auction.bankSale ? `Sans enchérisseur, ${lot.map((id) => assetById.get(id)!.name).join(" + ")} retourne au catalogue de la banque.` : `Sans enchérisseur, la banque reprend ${lot.map((id) => assetById.get(id)!.name).join(" + ")} pour ${auction.minimumBid} crédits.`, data: { amount: auction.bankSale ? 0 : auction.minimumBid, sellerId: seller.id, assetCount: lot.length, ...(!auction.bankSale ? bankEventData("bank_to_player", auction.minimumBid) : {}) } }));
  }
  const nextIndex = auction.currentLotIndex + 1;
  if (nextIndex >= auction.lots.length) {
    if (auction.bankSale) {
      const settled = { ...state, players, ownership, auction: null };
      const next = nextPlayable(settled, seller.id);
      events.push(...next.skipped.map((skipped) => makeEvent(state, { type: "turn_skipped" as const, playerId: skipped.id, message: `${skipped.name} passe ce tour à la suite d’une quarantaine orbitale.` })));
      events.push(makeEvent(state, { type: "turn_started", playerId: next.player.id, message: `Tour de ${next.player.name}.` }));
      const nextPhase = next.player.connected ? "WAITING_FOR_ROLL" : "PAUSED";
      if (!next.player.connected) events.push(makeEvent(state, { type: "game_paused", playerId: next.player.id, message: `La partie est en pause : ${next.player.name} doit se reconnecter avant son tour.` }));
      return commit({ ...settled, players: next.players, phase: nextPhase, previousPhase: next.player.connected ? null : "WAITING_FOR_ROLL", pauseReason: next.player.connected ? null : "PLAYER_DISCONNECTED", pausePlayerId: next.player.connected ? null : next.player.id, activePlayerId: next.player.id, turnNumber: state.turnNumber + 1 + next.skipped.length, roundNumber: state.roundNumber + (next.wrapped ? 1 : 0), lastRoll: null }, events);
    }
    return commit({ ...state, players, ownership, auction: null, phase: "WAITING_FOR_END_TURN" }, events);
  }
  const nextAuction = prepareAuctionLot(auction, nextIndex);
  const nextState = { ...state, players, ownership, auction: nextAuction };
  if (!nextAuction.eligiblePlayerIds.length) return closeAuctionLot(nextState, events);
  events.push(makeEvent(state, { type: "auction_started", message: `Lot suivant : ${nextAuction.lots[nextIndex]!.map((id) => assetById.get(id)!.name).join(" + ")}. Mise minimale : ${nextAuction.minimumBid} crédits.` }));
  return commit(nextState, events);
}

export function closeExpiredAuction(state: GameState, now = Date.now()): GameState {
  const auction = state.auction;
  if (state.phase !== "AUCTION" || !auction || auction.mode !== "bidding" || !auction.deadline || auction.deadline > now) return state;
  return closeAuctionLot(state);
}

function settleAuctionIfComplete(state: GameState, events: GameEvent[]): GameState {
  const auction = state.auction!;
  const allOpponentsPassed = auction.leaderId !== null && auction.eligiblePlayerIds.filter((id) => id !== auction.leaderId).every((id) => auction.passedPlayerIds.includes(id));
  const everybodyPassed = auction.leaderId === null && auction.eligiblePlayerIds.every((id) => auction.passedPlayerIds.includes(id));
  return allOpponentsPassed || everybodyPassed ? closeAuctionLot(state, events) : commit(state, events);
}

export function placeBid(state: GameState, playerId: string, amount: number): GameState {
  const player = requirePlayer(state, playerId); const auction = state.auction;
  if (state.phase !== "AUCTION" || !auction || auction.mode !== "bidding" || !auction.eligiblePlayerIds.includes(playerId) || auction.passedPlayerIds.includes(playerId) || auction.leaderId === playerId) throw new RuleError("BID_NOT_ALLOWED", "Vous ne pouvez pas enchérir maintenant.");
  const minimum = auction.currentBid ? Math.round((auction.currentBid + 0.1) * 10) / 10 : auction.minimumBid;
  if (!Number.isFinite(amount) || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8 || amount < minimum) throw new RuleError("BID_TOO_LOW", `L’offre minimale est de ${minimum} crédits.`);
  if (amount > player.capital) throw new RuleError("INSUFFICIENT_FUNDS", "Cette offre dépasse votre capital.");
  const next = { ...state, auction: { ...auction, currentBid: amount, leaderId: playerId, deadline: Date.now() + 10_000 } };
  return settleAuctionIfComplete(next, [makeEvent(state, { type: "auction_bid", playerId, message: `${player.name} propose ${amount} crédits.`, data: { amount, assetId: auction.assetId } })]);
}

export function passAuction(state: GameState, playerId: string): GameState {
  const player = requirePlayer(state, playerId); const auction = state.auction;
  if (state.phase !== "AUCTION" || !auction || auction.mode !== "bidding" || !auction.eligiblePlayerIds.includes(playerId) || auction.passedPlayerIds.includes(playerId) || auction.leaderId === playerId) throw new RuleError("BID_NOT_ALLOWED", "Vous ne pouvez pas passer maintenant.");
  const next = { ...state, auction: { ...auction, passedPlayerIds: [...auction.passedPlayerIds, playerId] } };
  return settleAuctionIfComplete(next, [makeEvent(state, { type: "auction_passed", playerId, message: `${player.name} se retire de ce lot.`, data: { assetId: auction.assetId } })]);
}

export function proposeTrade(state: GameState, playerId: string, offer: Omit<TradeOffer, "id" | "proposerId" | "returnPhase">): GameState {
  const proposer = requirePlayer(state, playerId);
  if (proposer.bankrupt) throw new RuleError("PLAYER_BANKRUPT", "Un joueur en faillite ne peut plus négocier.");
  if (proposer.mergedIntoId) throw new RuleError("ALLIANCE_ASSOCIATE", "Ce joueur appartient déjà à un consortium conjoint.");
  const liquidation = state.phase === "WAITING_FOR_PAYMENT" && state.activePlayerId === playerId && state.pendingPayment?.payerId === playerId && proposer.capital < state.pendingPayment.amount;
  if (state.phase !== "WAITING_FOR_ROLL" && state.phase !== "WAITING_FOR_END_TURN" && !liquidation) throw new RuleError("INVALID_PHASE", "Un transfert ne peut pas être proposé maintenant.");
  const target = requirePlayer(state, offer.targetId);
  if (target.id === playerId || target.bankrupt) throw new RuleError("INVALID_TRADE", "Choisissez un autre joueur solvable.");
  if (!target.connected) throw new RuleError("PLAYER_OFFLINE", "Ce joueur doit se reconnecter avant de recevoir une proposition.");
  if (target.mergedIntoId) throw new RuleError("INVALID_TRADE", "Choisissez le pilote du consortium conjoint.");
  if (offer.kind === "alliance") {
    if (liquidation || (state.phase !== "WAITING_FOR_ROLL" && state.phase !== "WAITING_FOR_END_TURN")) throw new RuleError("INVALID_PHASE", "Une alliance se conclut entre deux décisions obligatoires.");
    if (proposer.allianceId || target.allianceId) throw new RuleError("ALLIANCE_EXISTS", "Un des joueurs appartient déjà à un consortium conjoint.");
    const combinedPurchasePrice = [...proposer.assetIds, ...target.assetIds].reduce((total, id) => total + assetById.get(id)!.purchasePrice, 0);
    const allianceTax = combinedPurchasePrice / 2;
    if (proposer.capital < allianceTax || target.capital < allianceTax) throw new RuleError("INSUFFICIENT_FUNDS", `Chaque associé doit pouvoir verser ${allianceTax} crédits à la Banque interstellaire.`);
    const returnPhase: TradeOffer["returnPhase"] = state.phase === "WAITING_FOR_ROLL" ? "WAITING_FOR_ROLL" : "WAITING_FOR_END_TURN";
    const tradeOffer: TradeOffer = { ...offer, kind: "alliance", allianceTax, id: `alliance-${state.revision + 1}`, proposerId: playerId, returnPhase, offeredResourceId: null, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0 };
    return commit({ ...state, phase: "WAITING_FOR_TRADE", tradeOffer }, [makeEvent(state, { type: "trade_proposed", playerId, message: `${proposer.name} propose à ${target.name} de former un consortium conjoint. Chacun versera ${allianceTax} crédits à la banque.`, data: { tradeId: tradeOffer.id, targetId: target.id, alliance: true, allianceTax } })]);
  }
  const validAmount = (amount: number) => Number.isFinite(amount) && amount >= 0 && Math.abs(amount * 10 - Math.round(amount * 10)) < 1e-8;
  if (!validAmount(offer.offeredCredits) || !validAmount(offer.requestedCredits)) throw new RuleError("INVALID_TRADE", "Les montants doivent être positifs, par pas de 0,1 crédit.");
  if (offer.offeredCredits > proposer.capital || offer.requestedCredits > target.capital) throw new RuleError("INSUFFICIENT_FUNDS", "Un des montants dépasse le capital disponible.");
  const offeredAssetIds = offer.offeredResourceId ? proposer.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.offeredResourceId) : [];
  const requestedAssetIds = offer.requestedResourceId ? target.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.requestedResourceId) : [];
  if (offer.offeredResourceId && !offeredAssetIds.length) throw new RuleError("ASSET_NOT_OWNED", "Vous ne détenez aucune concession de la ressource offerte.");
  if (offer.requestedResourceId && !requestedAssetIds.length) throw new RuleError("ASSET_NOT_OWNED", "Ce joueur ne détient plus aucune concession de la ressource demandée.");
  if (!offer.offeredResourceId && !offer.requestedResourceId) throw new RuleError("INVALID_TRADE", "Une transaction doit porter sur au moins un groupe de ressource.");
  const isResourceExchange = Boolean(offer.offeredResourceId && offer.requestedResourceId);
  if (!isResourceExchange && state.activePlayerId !== playerId) throw new RuleError("NOT_ACTIVE_PLAYER", "Un achat ou une vente ne peut être proposé que pendant votre tour.");
  const returnPhase: TradeOffer["returnPhase"] = liquidation ? "WAITING_FOR_PAYMENT" : state.phase === "WAITING_FOR_ROLL" ? "WAITING_FOR_ROLL" : "WAITING_FOR_END_TURN";
  const tradeOffer: TradeOffer = { ...offer, id: `trade-${state.revision + 1}`, proposerId: playerId, returnPhase };
  const operation = isResourceExchange ? "un échange de ressources" : offer.offeredResourceId ? "une vente de concessions" : "un achat de concessions";
  return commit({ ...state, phase: "WAITING_FOR_TRADE", tradeOffer }, [makeEvent(state, { type: "trade_proposed", playerId, message: `${proposer.name} propose ${operation} à ${target.name}.`, data: { tradeId: tradeOffer.id, targetId: target.id } })]);
}

export function respondToTrade(state: GameState, playerId: string, accept: boolean): GameState {
  const offer = state.tradeOffer;
  if (state.phase !== "WAITING_FOR_TRADE" || !offer || (playerId !== offer.targetId && (accept || playerId !== offer.proposerId))) throw new RuleError("TRADE_NOT_ALLOWED", "Vous ne pouvez pas répondre à cette offre.");
  const proposer = requirePlayer(state, offer.proposerId); const target = requirePlayer(state, offer.targetId);
  if (!accept) return commit({ ...state, phase: offer.returnPhase, tradeOffer: null }, [makeEvent(state, { type: "trade_rejected", playerId, message: `${playerId === proposer.id ? proposer.name : target.name} annule l’échange.` })]);
  if (offer.kind === "alliance") {
    const combinedAssets = [...proposer.assetIds, ...target.assetIds];
    const tax = combinedAssets.reduce((total, id) => total + assetById.get(id)!.purchasePrice, 0) / 2;
    if (proposer.capital < tax || target.capital < tax) throw new RuleError("INSUFFICIENT_FUNDS", "Les capitaux ont changé : la taxe d’alliance ne peut plus être payée.");
    const proposerValue = proposer.assetIds.reduce((total, id) => total + assetById.get(id)!.purchasePrice, 0);
    const targetValue = target.assetIds.reduce((total, id) => total + assetById.get(id)!.purchasePrice, 0);
    const pilot = targetValue > proposerValue ? target : proposer;
    const associate = pilot.id === proposer.id ? target : proposer;
    const allianceId = `consortium-${state.revision + 1}`;
    const ownership = { ...state.ownership };
    combinedAssets.forEach((id) => { ownership[id] = pilot.id; });
    const players = state.players.map((player) => {
      if (player.id === pilot.id) return { ...player, capital: proposer.capital + target.capital - tax * 2, assetIds: combinedAssets, leverIds: [...proposer.leverIds, ...target.leverIds], allianceId, mergedIntoId: null };
      if (player.id === associate.id) return { ...player, capital: 0, assetIds: [], leverIds: [], allianceId, mergedIntoId: pilot.id, position: pilot.position, turnsToSkip: 0 };
      return player;
    });
    const activePlayerId = state.activePlayerId === associate.id ? pilot.id : state.activePlayerId;
    const events = [makeEvent(state, { type: "trade_accepted" as const, playerId, message: `${proposer.name} et ${target.name} forment désormais un consortium conjoint piloté par ${pilot.name}. Ils versent chacun ${tax} crédits à la Banque interstellaire.`, data: { tradeId: offer.id, alliance: true, allianceTax: tax, pilotId: pilot.id, associateId: associate.id, bankDirection: "player_to_bank", amount: tax * 2 } })];
    const alliedState = { ...state, players, ownership, activePlayerId, phase: offer.returnPhase, tradeOffer: null };
    if (players.filter((player) => !player.bankrupt && !player.mergedIntoId).length === 1) return finishWithReason(alliedState, "LAST_SOLVENT", events);
    return commit(alliedState, events);
  }
  if (proposer.capital < offer.offeredCredits || target.capital < offer.requestedCredits) throw new RuleError("INSUFFICIENT_FUNDS", "Les capitaux ont changé : l’offre n’est plus réalisable.");
  const offeredAssetIds = offer.offeredResourceId ? proposer.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.offeredResourceId) : [];
  const requestedAssetIds = offer.requestedResourceId ? target.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.requestedResourceId) : [];
  if (offer.offeredResourceId && !offeredAssetIds.length) throw new RuleError("ASSET_NOT_OWNED", "Le groupe offert a changé de propriétaire.");
  if (offer.requestedResourceId && !requestedAssetIds.length) throw new RuleError("ASSET_NOT_OWNED", "Le groupe demandé a changé de propriétaire.");
  const ownership = { ...state.ownership };
  offeredAssetIds.forEach((assetId) => { ownership[assetId] = target.id; });
  requestedAssetIds.forEach((assetId) => { ownership[assetId] = proposer.id; });
  const players = state.players.map((player) => {
    if (player.id === proposer.id) return { ...player, capital: player.capital - offer.offeredCredits + offer.requestedCredits, assetIds: [...player.assetIds.filter((id) => !offeredAssetIds.includes(id)), ...requestedAssetIds] };
    if (player.id === target.id) return { ...player, capital: player.capital - offer.requestedCredits + offer.offeredCredits, assetIds: [...player.assetIds.filter((id) => !requestedAssetIds.includes(id)), ...offeredAssetIds] };
    return player;
  });
  const movedTitles = offeredAssetIds.length + requestedAssetIds.length;
  return commit({ ...state, players, ownership, phase: offer.returnPhase, tradeOffer: null }, [makeEvent(state, { type: "trade_accepted", playerId, message: `${target.name} accepte l’accord proposé par ${proposer.name} : ${movedTitles} concession${movedTitles > 1 ? "s" : ""} change${movedTitles > 1 ? "nt" : ""} de main.`, data: { tradeId: offer.id, assetCount: movedTitles } })]);
}

export function endTurn(state: GameState, playerId: string): GameState {
  requireActive(state, playerId);
  if (state.phase !== "WAITING_FOR_END_TURN") throw new RuleError("INVALID_PHASE", "Le tour n’est pas terminé.");
  const next = nextPlayable(state, playerId);
  const events: GameEvent[] = next.skipped.map((skipped) => makeEvent(state, { type: "turn_skipped", playerId: skipped.id, message: `${skipped.name} passe ce tour à la suite d’une quarantaine orbitale.` }));
  const nextRound = state.roundNumber + (next.wrapped ? 1 : 0);
  const base = { ...state, players: next.players, activePlayerId: next.player.id, turnNumber: state.turnNumber + 1 + next.skipped.length, roundNumber: nextRound, lastRoll: null, landedSpaceId: null, landedAssetId: null, lastCard: null };
  events.push(makeEvent(state, { type: "turn_started", playerId: next.player.id, message: `Tour de ${next.player.name}.` }));
  const nextPhase = next.player.connected ? "WAITING_FOR_ROLL" : "PAUSED";
  if (!next.player.connected) events.push(makeEvent(state, { type: "game_paused", playerId: next.player.id, message: `La partie est en pause : ${next.player.name} doit se reconnecter avant son tour.` }));
  return commit({ ...base, phase: nextPhase, previousPhase: next.player.connected ? null : "WAITING_FOR_ROLL", pauseReason: next.player.connected ? null : "PLAYER_DISCONNECTED", pausePlayerId: next.player.connected ? null : next.player.id }, events);
}

export function pauseGame(state: GameState, reason: GameState["pauseReason"] = "ADMIN", playerId: string | null = null, now = Date.now()): GameState {
  if (state.phase === "LOBBY" || state.phase === "FINISHED" || state.phase === "PAUSED") throw new RuleError("INVALID_PHASE", "La partie ne peut pas être mise en pause.");
  const player = playerId ? state.players.find((item) => item.id === playerId) : null;
  const message = reason === "PLAYER_DISCONNECTED" && player ? `La partie est en pause : ${player.name} a perdu la connexion.` : "La partie a été mise en pause par l’hôte.";
  const startingRace = state.phase === "SHIP_RACE" ? { ...state.startingRace, pausedAt: now } : state.startingRace;
  return commit({ ...state, startingRace, previousPhase: state.phase, phase: "PAUSED", pauseReason: reason, pausePlayerId: playerId }, [makeEvent(state, { type: "game_paused", message, ...(playerId ? { playerId } : {}) })]);
}

export function resumeGame(state: GameState, now = Date.now()): GameState {
  if (state.phase !== "PAUSED" || !state.previousPhase) throw new RuleError("INVALID_PHASE", "La partie n’est pas en pause.");
  if (state.players.some((player) => !player.bankrupt && !player.mergedIntoId && !player.connected)) throw new RuleError("PLAYER_OFFLINE", "Tous les joueurs actifs doivent être reconnectés avant de reprendre.");
  const startingRace = state.previousPhase === "SHIP_RACE" && state.startingRace.raceEndsAt && state.startingRace.pausedAt
    ? { ...state.startingRace, raceEndsAt: state.startingRace.raceEndsAt + now - state.startingRace.pausedAt, pausedAt: null }
    : state.startingRace;
  return commit({ ...state, startingRace, phase: state.previousPhase, previousPhase: null, pauseReason: null, pausePlayerId: null }, [makeEvent(state, { type: "game_resumed", message: "Tout le monde est reconnecté. La partie reprend." })]);
}

export function finishGame(state: GameState): GameState {
  if (state.phase === "FINISHED") return state;
  return finishWithReason(state, "ADMIN", []);
}

export function restartGame(state: GameState): GameState {
  if (state.phase !== "FINISHED") throw new RuleError("INVALID_PHASE", "La partie doit être terminée avant d’en préparer une nouvelle.");
  const [, nextSeed] = nextRandom(state.rngState);
  const fresh = createGame(state.id, state.code, nextSeed);
  const players: PlayerState[] = state.players.map(({ id, name, color, symbol, connected }) => ({
    id, name, color, symbol, connected, ready: false, position: 0, lapsCompleted: 0, turnsToSkip: 0,
    capital: 30, assetIds: [], leverIds: [], bankrupt: false, allianceId: null, mergedIntoId: null
  }));
  return {
    ...fresh,
    revision: state.revision + 1,
    players,
    startingRace: { selections: {}, finishOrder: [], winnerPlayerId: null, raceEndsAt: null, pausedAt: null }, recentEvents: [makeEvent(state, { type: "game_restarted", message: "Une nouvelle partie est prête. Chaque joueur doit confirmer sa présence." })]
  };
}
