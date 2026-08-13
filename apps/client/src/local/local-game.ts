import {
  BOARD,
  SECTORS,
  addPlayer,
  buyPendingAsset,
  buyPendingLever,
  createGame,
  declareBankruptcy,
  decideBotAction,
  endTurn,
  finishGame,
  getNetWorth,
  getSectorInfluence,
  observeGameForBot,
  passAuction,
  passPendingAsset,
  passPendingLever,
  pauseGame,
  payPendingPayment,
  placeBid,
  proposeTrade,
  respondToTrade,
  restartGame,
  resumeGame,
  rollDice,
  selectAuctionAssets,
  setPlayerReady,
  startGame,
  useLever,
  type BotDecision,
  type GameEvent,
  type GameState
} from "@richesses-espace/game";
import type { DisplayMode, PlayerAction, PlayerGameView, PublicGameView, SessionResult, TradeProposalPayload } from "@richesses-espace/protocol";

export const LOCAL_GAME_STORAGE_KEY = "richesses-espace:local-game:v1";
export const LOCAL_GAME_CODE = "SOLO";
export const LOCAL_HUMAN_ID = "lyra";
export const LOCAL_BOT_ID = "orion";

export interface LocalGameSnapshot {
  game: PublicGameView;
  player: PlayerGameView | null;
  events: GameEvent[];
}

export interface LocalBotTurn {
  playerId: typeof LOCAL_BOT_ID;
  decision: BotDecision;
  expectedRevision: number;
  delay: number;
}

let state: GameState | null = null;
let displayMode: DisplayMode = "MOBILE_ONLY";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function persist(): void {
  if (!state || !canUseStorage()) return;
  window.localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 1, state }));
}

function restore(force = false): boolean {
  if (!canUseStorage() || (!force && state)) return Boolean(state);
  try {
    const stored = JSON.parse(window.localStorage.getItem(LOCAL_GAME_STORAGE_KEY) ?? "null") as { version?: number; state?: GameState } | null;
    if (!stored || stored.version !== 1 || !stored.state) return false;
    const ids = stored.state.players.map((player) => player.id);
    if (!ids.includes(LOCAL_HUMAN_ID) || !ids.includes(LOCAL_BOT_ID)) return false;
    state = stored.state;
    return true;
  } catch {
    return false;
  }
}

function createLocalGame(): GameState {
  let next = createGame("local-solo", LOCAL_GAME_CODE, 20_260_813);
  next = addPlayer(next, { id: LOCAL_HUMAN_ID, name: "Lyra", color: "#e4a72f", symbol: "bird" });
  next = addPlayer(next, { id: LOCAL_BOT_ID, name: "Orion", color: "#3784a6", symbol: "cat" });
  next = setPlayerReady(next, LOCAL_HUMAN_ID, true);
  next = setPlayerReady(next, LOCAL_BOT_ID, true);
  return startGame(next);
}

function actionsFor(current: GameState, playerId: string): PlayerAction[] {
  if (current.phase === "LOBBY") return ["SET_READY"];
  if (current.phase === "AUCTION" && current.auction?.mode === "selection" && current.auction.sellerId === playerId) return ["SELECT_AUCTION_ASSETS"];
  if (current.phase === "AUCTION" && current.auction?.mode === "bidding" && current.auction.eligiblePlayerIds.includes(playerId) && !current.auction.passedPlayerIds.includes(playerId) && current.auction.leaderId !== playerId) return ["BID", "PASS_BID"];
  if (current.phase === "WAITING_FOR_TRADE" && current.tradeOffer?.targetId === playerId) return ["ACCEPT_TRADE", "REJECT_TRADE"];
  if (current.phase === "WAITING_FOR_TRADE" && current.tradeOffer?.proposerId === playerId) return ["REJECT_TRADE"];
  const actions: PlayerAction[] = [];
  const player = current.players.find((item) => item.id === playerId);
  if (!player || player.mergedIntoId) return actions;
  const canLiquidateDebt = current.phase === "WAITING_FOR_PAYMENT" && current.activePlayerId === playerId && current.pendingPayment?.payerId === playerId && player.capital < current.pendingPayment.amount && Boolean(player.assetIds.length);
  if (!player.bankrupt && (current.phase === "WAITING_FOR_ROLL" || current.phase === "WAITING_FOR_END_TURN" || canLiquidateDebt)) actions.push("PROPOSE_TRADE");
  if (current.activePlayerId !== playerId) return actions;
  if (current.phase === "WAITING_FOR_ROLL") actions.push("ROLL_DICE");
  if (current.phase === "WAITING_FOR_PURCHASE") actions.push("BUY_ASSET", "PASS_ASSET");
  if (current.phase === "WAITING_FOR_LEVER_PURCHASE") actions.push("BUY_LEVER", "PASS_LEVER");
  if (current.phase === "WAITING_FOR_PAYMENT") actions.push(player.capital >= (current.pendingPayment?.amount ?? Infinity) ? "PAY_RETURNS" : "DECLARE_BANKRUPTCY");
  if (current.phase === "WAITING_FOR_END_TURN") actions.push("END_TURN");
  if (player.leverIds.length) actions.push("USE_LEVER");
  return actions;
}

function joinUrl(): string {
  const origin = typeof window === "undefined" ? "https://mathieuluyten.be" : window.location.origin;
  const url = new URL(import.meta.env.BASE_URL, origin);
  url.hash = `/play/${LOCAL_GAME_CODE}`;
  return url.toString();
}

function publicView(current: GameState, botThinkingPlayerId: string | null = null): PublicGameView {
  return {
    code: current.code,
    displayMode,
    revision: current.revision,
    status: current.status,
    phase: current.phase,
    players: current.players.map(({ id, name, color, symbol, connected, ready, position, lapsCompleted, turnsToSkip, capital, assetIds, leverIds, bankrupt, allianceId, mergedIntoId }) => ({
      id,
      name,
      color,
      symbol,
      connected,
      ready,
      isBot: id === LOCAL_BOT_ID,
      botProfile: id === LOCAL_BOT_ID ? "BALANCED" : null,
      position,
      lapsCompleted,
      turnsToSkip,
      capital,
      assetIds,
      leverCount: leverIds.length,
      bankrupt,
      allianceId,
      mergedIntoId,
      netWorth: getNetWorth(current, id),
      sectorInfluence: Object.fromEntries(SECTORS.map((sector) => [sector.id, getSectorInfluence(current, id, sector.id)])) as Record<(typeof SECTORS)[number]["id"], number>
    })),
    activePlayerId: current.activePlayerId,
    botThinkingPlayerId,
    turnNumber: current.turnNumber,
    roundNumber: current.roundNumber,
    ownership: current.ownership,
    lastRoll: current.lastRoll,
    pendingAssetId: current.pendingAction?.availableAssetIds[0] ?? null,
    pendingPrice: null,
    pendingPurchase: current.pendingAction ? {
      source: current.pendingAction.source,
      countryId: current.pendingAction.countryId,
      resourceId: current.pendingAction.resourceId,
      label: current.pendingAction.label,
      availableAssetIds: current.pendingAction.availableAssetIds,
      maxAssets: current.pendingAction.maxAssets
    } : null,
    pendingLever: current.pendingLever ? { price: current.pendingLever.price } : null,
    pendingPayment: current.pendingPayment ? {
      ...current.pendingPayment,
      payableAmount: Math.min(current.players.find((player) => player.id === current.pendingPayment!.payerId)?.capital ?? 0, current.pendingPayment.amount)
    } : null,
    auction: current.auction,
    tradeOffer: current.tradeOffer,
    lastCard: current.lastCard,
    landedSpaceId: current.landedSpaceId,
    landedAssetId: current.landedAssetId,
    pauseReason: current.pauseReason,
    pausePlayerId: current.pausePlayerId,
    recentEvents: current.recentEvents,
    board: BOARD,
    joinUrls: [joinUrl()],
    winnerId: current.winnerId,
    finishReason: current.finishReason
  };
}

function snapshot(events: GameEvent[] = [], includePlayer = true, botThinkingPlayerId: string | null = null): LocalGameSnapshot {
  if (!state) state = createLocalGame();
  const human = state.players.find((player) => player.id === LOCAL_HUMAN_ID)!;
  return {
    game: publicView(state, botThinkingPlayerId),
    player: includePlayer ? {
      playerId: LOCAL_HUMAN_ID,
      token: "local-solo-player",
      isHost: true,
      allowedActions: actionsFor(state, LOCAL_HUMAN_ID),
      leverIds: human.leverIds,
      pendingLever: state.pendingLever?.playerId === LOCAL_HUMAN_ID ? { leverId: state.pendingLever.leverId, price: state.pendingLever.price } : null
    } : null,
    events
  };
}

export function loadLocalGame(mode: DisplayMode = "MOBILE_ONLY", includePlayer = true, forceStorageReload = false): LocalGameSnapshot {
  displayMode = mode;
  if (!restore(forceStorageReload)) {
    state = createLocalGame();
    persist();
  }
  return snapshot([], includePlayer);
}

export function resetLocalGame(mode: DisplayMode = displayMode, includePlayer = true): LocalGameSnapshot {
  displayMode = mode;
  state = createLocalGame();
  persist();
  return snapshot([], includePlayer);
}

function applyCommand(event: string, playerId: string, payload?: unknown): void {
  if (!state) state = createLocalGame();
  const input = (payload ?? {}) as Record<string, unknown>;
  switch (event) {
    case "turn:roll": state = rollDice(state, playerId); break;
    case "purchase:buy": state = buyPendingAsset(state, playerId, input.assetIds as string[] | undefined); break;
    case "purchase:pass": state = passPendingAsset(state, playerId); break;
    case "lever:buy": state = buyPendingLever(state, playerId); break;
    case "lever:pass": state = passPendingLever(state, playerId); break;
    case "payment:pay": state = payPendingPayment(state, playerId); break;
    case "finance:bankruptcy": state = declareBankruptcy(state, playerId); break;
    case "lever:use": state = useLever(state, playerId, String(input.leverId ?? "")); break;
    case "auction:select": state = selectAuctionAssets(state, playerId, input.assetIds as string[]); break;
    case "auction:bid": state = placeBid(state, playerId, Number(input.amount)); break;
    case "auction:pass": state = passAuction(state, playerId); break;
    case "trade:propose": state = proposeTrade(state, playerId, input as unknown as TradeProposalPayload); break;
    case "trade:accept": state = respondToTrade(state, playerId, true); break;
    case "trade:reject": state = respondToTrade(state, playerId, false); break;
    case "turn:end": state = endTurn(state, playerId); break;
    case "admin:pause": state = pauseGame(state); break;
    case "admin:resume": state = resumeGame(state); break;
    case "admin:end": state = finishGame(state); break;
    case "admin:restart": {
      state = restartGame(state);
      state = setPlayerReady(state, LOCAL_HUMAN_ID, true);
      state = setPlayerReady(state, LOCAL_BOT_ID, true);
      state = startGame(state);
      break;
    }
    default: throw new Error(`Action locale inconnue : ${event}`);
  }
}

export function runLocalGameCommand(event: string, payload?: unknown): { snapshot: LocalGameSnapshot; data?: SessionResult } {
  if (!state) state = createLocalGame();
  const beforeRevision = state.revision;
  applyCommand(event, LOCAL_HUMAN_ID, payload);
  const events = state.recentEvents.filter((item) => item.id > beforeRevision);
  persist();
  return { snapshot: snapshot(events) };
}

function botMutation(current: GameState, decision: BotDecision): GameState {
  switch (decision.type) {
    case "ROLL": return rollDice(current, LOCAL_BOT_ID);
    case "BUY_ASSETS": return buyPendingAsset(current, LOCAL_BOT_ID, decision.assetIds);
    case "PASS_ASSETS": return passPendingAsset(current, LOCAL_BOT_ID);
    case "BUY_LEVER": return buyPendingLever(current, LOCAL_BOT_ID);
    case "PASS_LEVER": return passPendingLever(current, LOCAL_BOT_ID);
    case "PAY": return payPendingPayment(current, LOCAL_BOT_ID);
    case "DECLARE_BANKRUPTCY": return declareBankruptcy(current, LOCAL_BOT_ID);
    case "USE_LEVER": return useLever(current, LOCAL_BOT_ID, decision.leverId);
    case "SELECT_AUCTION_ASSETS": return selectAuctionAssets(current, LOCAL_BOT_ID, decision.assetIds);
    case "BID": return placeBid(current, LOCAL_BOT_ID, decision.amount);
    case "PASS_BID": return passAuction(current, LOCAL_BOT_ID);
    case "RESPOND_TRADE": return respondToTrade(current, LOCAL_BOT_ID, decision.accept);
    case "END_TURN": return endTurn(current, LOCAL_BOT_ID);
  }
}

export function getLocalBotTurn(): LocalBotTurn | null {
  if (!state) state = createLocalGame();
  const decision = decideBotAction(observeGameForBot(state, LOCAL_BOT_ID), LOCAL_BOT_ID, "BALANCED");
  if (!decision) return null;
  const rolledThisRevision = state.recentEvents.some((event) => event.id === state!.revision && event.type === "dice_rolled");
  const delay = rolledThisRevision ? 2_800 + (state.lastRoll?.total ?? 0) * 210
    : decision.type === "ROLL" ? 700
      : decision.type === "BID" || decision.type === "PASS_BID" ? 800
        : 900;
  return { playerId: LOCAL_BOT_ID, decision, expectedRevision: state.revision, delay };
}

export function runLocalBotTurn(expectedRevision: number): LocalGameSnapshot | null {
  if (!state || state.revision !== expectedRevision) return null;
  const decision = decideBotAction(observeGameForBot(state, LOCAL_BOT_ID), LOCAL_BOT_ID, "BALANCED");
  if (!decision) return null;
  const beforeRevision = state.revision;
  state = botMutation(state, decision);
  const events = state.recentEvents.filter((item) => item.id > beforeRevision);
  persist();
  return snapshot(events);
}
