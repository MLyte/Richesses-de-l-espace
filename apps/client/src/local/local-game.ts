import {
  BOARD,
  RuleError,
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
import { PLAYER_COLORS, PLAYER_SYMBOLS, type DisplayMode, type PlayerAction, type PlayerGameView, type PublicGameView, type SessionResult, type TradeProposalPayload } from "@richesses-espace/protocol";

export const LOCAL_GAME_STORAGE_KEY = "richesses-espace:local-game:v2";
export const LOCAL_GAME_CODE = "SOLO";
export const LOCAL_HUMAN_ID = "human";
export const LOCAL_BOT_ID = "orion";
export const LOCAL_BOT_NAMES = [
  "Aigle",
  "Andromède",
  "Baleine",
  "Bélier",
  "Bouvier",
  "Cancer",
  "Capricorne",
  "Cassiopée",
  "Cygne",
  "Dragon",
  "Gémeaux",
  "Grande Ourse",
  "Hydre",
  "Lion",
  "Lyre",
  "Orion",
  "Pégase",
  "Persée",
  "Poissons",
  "Verseau"
] as const;

export interface LocalPlayerSetup {
  name: string;
  color: string;
  symbol: string;
}

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
  window.localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify({ version: 2, state }));
}

function restore(force = false): boolean {
  if (!canUseStorage() || (!force && state)) return Boolean(state);
  if (force) state = null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(LOCAL_GAME_STORAGE_KEY) ?? "null") as { version?: number; state?: GameState } | null;
    if (!stored || stored.version !== 2 || !stored.state) return false;
    const ids = stored.state.players.map((player) => player.id);
    if (!ids.includes(LOCAL_HUMAN_ID) || !ids.includes(LOCAL_BOT_ID)) return false;
    state = stored.state;
    return true;
  } catch {
    return false;
  }
}

function validateSetup(setup: LocalPlayerSetup): LocalPlayerSetup {
  const name = setup.name.trim();
  if (!name || name.length > 20) throw new RuleError("INVALID_NAME", "Choisissez un pseudo de 1 à 20 caractères.");
  if (!(PLAYER_COLORS as readonly string[]).includes(setup.color)) throw new RuleError("INVALID_COLOR", "Choisissez une couleur proposée.");
  if (!PLAYER_SYMBOLS.some((item) => item.id === setup.symbol)) throw new RuleError("INVALID_SYMBOL", "Choisissez un animal proposé.");
  return { name, color: setup.color, symbol: setup.symbol };
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomBotIdentity(human: LocalPlayerSetup): LocalPlayerSetup {
  const availableNames = LOCAL_BOT_NAMES.filter((name) => name.localeCompare(human.name, "fr", { sensitivity: "base" }) !== 0);
  const availableColors = PLAYER_COLORS.filter((color) => color !== human.color);
  const availableSymbols = PLAYER_SYMBOLS.filter((symbol) => symbol.id !== human.symbol);
  return {
    name: randomItem(availableNames),
    color: randomItem(availableColors),
    symbol: randomItem(availableSymbols).id
  };
}

function createLocalGame(setup: LocalPlayerSetup): GameState {
  const human = validateSetup(setup);
  const bot = randomBotIdentity(human);
  let next = createGame("local-solo", LOCAL_GAME_CODE, 20_260_813);
  next = addPlayer(next, { id: LOCAL_HUMAN_ID, ...human });
  next = addPlayer(next, { id: LOCAL_BOT_ID, ...bot });
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
  if (!state) throw new RuleError("LOCAL_GAME_NOT_CONFIGURED", "Choisissez d’abord votre identité de joueur.");
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
  if (!restore(forceStorageReload)) throw new RuleError("LOCAL_GAME_NOT_CONFIGURED", "Choisissez d’abord votre identité de joueur.");
  return snapshot([], includePlayer);
}

export function resumeLocalGame(mode: DisplayMode = "MOBILE_ONLY", includePlayer = true, forceStorageReload = false): LocalGameSnapshot | null {
  displayMode = mode;
  return restore(forceStorageReload) ? snapshot([], includePlayer) : null;
}

export function startLocalGame(setup: LocalPlayerSetup, mode: DisplayMode = "MOBILE_ONLY", includePlayer = true): LocalGameSnapshot {
  displayMode = mode;
  state = createLocalGame(setup);
  persist();
  return snapshot([], includePlayer);
}

export function hasSavedLocalGame(): boolean {
  return restore();
}

function requireLocalState(): GameState {
  if (state) return state;
  if (restore() && state) return state;
  throw new RuleError("LOCAL_GAME_NOT_CONFIGURED", "Choisissez d’abord votre identité de joueur.");
}

function applyCommand(event: string, playerId: string, payload?: unknown): void {
  const current = requireLocalState();
  const input = (payload ?? {}) as Record<string, unknown>;
  switch (event) {
    case "turn:roll": state = rollDice(current, playerId); break;
    case "purchase:buy": state = buyPendingAsset(current, playerId, input.assetIds as string[] | undefined); break;
    case "purchase:pass": state = passPendingAsset(current, playerId); break;
    case "lever:buy": state = buyPendingLever(current, playerId); break;
    case "lever:pass": state = passPendingLever(current, playerId); break;
    case "payment:pay": state = payPendingPayment(current, playerId); break;
    case "finance:bankruptcy": state = declareBankruptcy(current, playerId); break;
    case "lever:use": state = useLever(current, playerId, String(input.leverId ?? "")); break;
    case "auction:select": state = selectAuctionAssets(current, playerId, input.assetIds as string[]); break;
    case "auction:bid": state = placeBid(current, playerId, Number(input.amount)); break;
    case "auction:pass": state = passAuction(current, playerId); break;
    case "trade:propose": state = proposeTrade(current, playerId, input as unknown as TradeProposalPayload); break;
    case "trade:accept": state = respondToTrade(current, playerId, true); break;
    case "trade:reject": state = respondToTrade(current, playerId, false); break;
    case "turn:end": state = endTurn(current, playerId); break;
    case "admin:pause": state = pauseGame(current); break;
    case "admin:resume": state = resumeGame(current); break;
    case "admin:end": state = finishGame(current); break;
    case "admin:restart": {
      let restarted = restartGame(current);
      const human = restarted.players.find((player) => player.id === LOCAL_HUMAN_ID)!;
      const bot = randomBotIdentity(human);
      restarted = { ...restarted, players: restarted.players.map((player) => player.id === LOCAL_BOT_ID ? { ...player, ...bot } : player) };
      restarted = setPlayerReady(restarted, LOCAL_HUMAN_ID, true);
      restarted = setPlayerReady(restarted, LOCAL_BOT_ID, true);
      state = startGame(restarted);
      break;
    }
    default: throw new Error(`Action locale inconnue : ${event}`);
  }
}

export function runLocalGameCommand(event: string, payload?: unknown): { snapshot: LocalGameSnapshot; data?: SessionResult } {
  const beforeRevision = requireLocalState().revision;
  applyCommand(event, LOCAL_HUMAN_ID, payload);
  const events = requireLocalState().recentEvents.filter((item) => item.id > beforeRevision);
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
  const current = state ?? (restore() ? state : null);
  if (!current) return null;
  const decision = decideBotAction(observeGameForBot(current, LOCAL_BOT_ID), LOCAL_BOT_ID, "BALANCED");
  if (!decision) return null;
  const rolledThisRevision = current.recentEvents.some((event) => event.id === current.revision && event.type === "dice_rolled");
  const delay = rolledThisRevision ? 2_800 + (current.lastRoll?.total ?? 0) * 210
    : decision.type === "ROLL" ? 700
      : decision.type === "BID" || decision.type === "PASS_BID" ? 800
        : 900;
  return { playerId: LOCAL_BOT_ID, decision, expectedRevision: current.revision, delay };
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
