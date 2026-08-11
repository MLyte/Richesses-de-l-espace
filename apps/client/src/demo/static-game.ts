import {
  ASSETS,
  BOARD,
  SECTORS,
  addPlayer,
  buyPendingAsset,
  buyPendingLever,
  createGame,
  declareBankruptcy,
  endTurn,
  finishGame,
  getNetWorth,
  getSectorInfluence,
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
  type GameEvent,
  type GameState
} from "@richesses-espace/game";
import type { DisplayMode, PlayerAction, PlayerGameView, PublicGameView, SessionResult, TradeProposalPayload } from "@richesses-espace/protocol";

export const STATIC_DEMO_SCENARIOS = [
  { id: "turn", label: "Tour libre" },
  { id: "purchase", label: "Achat" },
  { id: "payment", label: "Paiement" },
  { id: "auction", label: "Enchère" },
  { id: "trade", label: "Échange" },
  { id: "pause", label: "Pause" },
  { id: "finished", label: "Fin de partie" }
] as const;

export type StaticDemoScenarioId = (typeof STATIC_DEMO_SCENARIOS)[number]["id"];
export type StaticDemoPlayerId = "orion" | "lyra";

export interface StaticDemoSnapshot {
  game: PublicGameView;
  player: PlayerGameView | null;
  events: GameEvent[];
  scenario: StaticDemoScenarioId;
  playerId: StaticDemoPlayerId;
}

const STORAGE_KEY = "richesses-espace:static-demo:v1";
const ORION_ASSETS = ["xylem-fibers-vesta", "stellar-cobalt-vesta", "algal-biomass-vesta", "cellular-proteins-vesta"];
const LYRA_ASSETS = ["aluminous-regolith-mars", "synthetic-stimulants-mars", "water-ice-mars"];
const scenarioPlayers: Record<StaticDemoScenarioId, StaticDemoPlayerId> = {
  turn: "lyra",
  purchase: "lyra",
  payment: "lyra",
  auction: "lyra",
  trade: "lyra",
  pause: "orion",
  finished: "lyra"
};

let state: GameState | null = null;
let scenario: StaticDemoScenarioId = "turn";
let playerId: StaticDemoPlayerId = "lyra";
let displayMode: DisplayMode = "MOBILE_ONLY";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function persist(): void {
  if (!state || !canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state, scenario, playerId }));
}

function restore(): boolean {
  if (!canUseStorage()) return false;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as { version?: number; state?: GameState; scenario?: StaticDemoScenarioId; playerId?: StaticDemoPlayerId } | null;
    if (!stored || stored.version !== 1 || !stored.state || !STATIC_DEMO_SCENARIOS.some((item) => item.id === stored.scenario)) return false;
    state = stored.state;
    scenario = stored.scenario!;
    playerId = stored.playerId === "orion" ? "orion" : "lyra";
    return true;
  } catch {
    return false;
  }
}

function createBaseState(): GameState {
  let next = createGame("static-demo", "DEMO", 20_260_811);
  next = addPlayer(next, { id: "orion", name: "Orion", color: "#3784a6", symbol: "cat" });
  next = addPlayer(next, { id: "lyra", name: "Lyra", color: "#e4a72f", symbol: "bird" });
  next = setPlayerReady(next, "orion", true);
  next = setPlayerReady(next, "lyra", true);
  next = startGame(next);

  const orionPosition = BOARD.findIndex((space) => space.type === "asset" && space.assetId === "stellar-cobalt-vesta");
  const lyraPosition = BOARD.findIndex((space) => space.type === "asset" && space.assetId === "aluminous-regolith-vesta");
  const ownership = Object.fromEntries([
    ...ORION_ASSETS.map((id) => [id, "orion"]),
    ...LYRA_ASSETS.map((id) => [id, "lyra"])
  ]);

  return {
    ...next,
    revision: 10,
    players: next.players.map((player) => player.id === "orion"
      ? { ...player, position: orionPosition, capital: 78, assetIds: [...ORION_ASSETS] }
      : { ...player, position: lyraPosition, lapsCompleted: 1, capital: 84, assetIds: [...LYRA_ASSETS] }),
    activePlayerId: "lyra",
    turnNumber: 8,
    roundNumber: 4,
    ownership,
    lastRoll: null,
    pendingAction: null,
    pendingLever: null,
    pendingPayment: null,
    paymentQueue: [],
    auction: null,
    tradeOffer: null,
    lastCard: null,
    landedSpaceId: null,
    landedAssetId: null,
    recentEvents: []
  };
}

function createScenarioState(id: StaticDemoScenarioId): GameState {
  const base = createBaseState();
  if (id === "turn") return { ...base, phase: "WAITING_FOR_ROLL" };

  if (id === "purchase") {
    const featured = ASSETS.find((asset) => !base.ownership[asset.id] && ASSETS.filter((candidate) => candidate.countryId === asset.countryId && !base.ownership[candidate.id]).length >= 2)!;
    const availableAssetIds = ASSETS.filter((asset) => asset.countryId === featured.countryId && !base.ownership[asset.id]).map((asset) => asset.id);
    const position = BOARD.findIndex((space) => space.type === "asset" && space.assetId === featured.id);
    return {
      ...base,
      phase: "WAITING_FOR_PURCHASE",
      players: base.players.map((player) => player.id === "lyra" ? { ...player, position } : player),
      pendingAction: { type: "purchase", source: "classic", playerId: "lyra", countryId: featured.countryId, resourceId: featured.resourceId, label: featured.hub, availableAssetIds, maxAssets: Math.min(6, availableAssetIds.length) },
      landedSpaceId: BOARD[position]?.id ?? null,
      landedAssetId: featured.id
    };
  }

  if (id === "payment") {
    const assetId = ORION_ASSETS[0]!;
    const asset = ASSETS.find((item) => item.id === assetId)!;
    const position = BOARD.findIndex((space) => space.type === "asset" && space.assetId === assetId);
    const payment = { type: "payment" as const, payerId: "lyra", recipientId: "orion", assetId, resourceId: asset.resourceId, amount: 8 };
    return {
      ...base,
      phase: "WAITING_FOR_PAYMENT",
      players: base.players.map((player) => player.id === "lyra" ? { ...player, position } : player),
      pendingPayment: payment,
      paymentQueue: [],
      landedSpaceId: BOARD[position]?.id ?? null,
      landedAssetId: assetId
    };
  }

  if (id === "auction") {
    const assetId = ORION_ASSETS[1]!;
    return {
      ...base,
      activePlayerId: "orion",
      phase: "AUCTION",
      auction: {
        mode: "bidding",
        sellerId: "orion",
        bankSale: false,
        targetCount: 1,
        redDie: 1,
        assetId,
        selectedAssetIds: [assetId],
        lots: [[assetId]],
        currentLotIndex: 0,
        minimumBid: 4,
        currentBid: 0,
        leaderId: null,
        eligiblePlayerIds: ["lyra"],
        passedPlayerIds: [],
        deadline: Date.now() + 10_000
      },
      landedAssetId: assetId
    };
  }

  if (id === "trade") {
    const offeredResourceId = ASSETS.find((asset) => asset.id === ORION_ASSETS[0])!.resourceId;
    const requestedResourceId = ASSETS.find((asset) => asset.id === LYRA_ASSETS[0])!.resourceId;
    return {
      ...base,
      activePlayerId: "orion",
      phase: "WAITING_FOR_TRADE",
      tradeOffer: { id: "trade-demo", proposerId: "orion", targetId: "lyra", offeredResourceId, requestedResourceId, offeredCredits: 2, requestedCredits: 0, returnPhase: "WAITING_FOR_END_TURN" }
    };
  }

  if (id === "pause") return { ...base, phase: "PAUSED", previousPhase: "WAITING_FOR_ROLL", pauseReason: "ADMIN", pausePlayerId: null };
  return { ...base, status: "FINISHED", phase: "FINISHED", winnerId: "lyra", finishReason: "ADMIN" };
}

function actionsFor(current: GameState, id: string): PlayerAction[] {
  if (current.phase === "LOBBY") return ["SET_READY"];
  if (current.phase === "AUCTION" && current.auction?.mode === "selection" && current.auction.sellerId === id) return ["SELECT_AUCTION_ASSETS"];
  if (current.phase === "AUCTION" && current.auction?.mode === "bidding" && current.auction.eligiblePlayerIds.includes(id) && !current.auction.passedPlayerIds.includes(id) && current.auction.leaderId !== id) return ["BID", "PASS_BID"];
  if (current.phase === "WAITING_FOR_TRADE" && current.tradeOffer?.targetId === id) return ["ACCEPT_TRADE", "REJECT_TRADE"];
  if (current.phase === "WAITING_FOR_TRADE" && current.tradeOffer?.proposerId === id) return ["REJECT_TRADE"];
  const actions: PlayerAction[] = [];
  const player = current.players.find((item) => item.id === id);
  if (!player || player.mergedIntoId) return actions;
  const canLiquidateDebt = current.phase === "WAITING_FOR_PAYMENT" && current.activePlayerId === id && current.pendingPayment?.payerId === id && player.capital < current.pendingPayment.amount && Boolean(player.assetIds.length);
  if (!player.bankrupt && (current.phase === "WAITING_FOR_ROLL" || current.phase === "WAITING_FOR_END_TURN" || canLiquidateDebt)) actions.push("PROPOSE_TRADE");
  if (current.activePlayerId !== id) return actions;
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
  url.hash = "/play/DEMO";
  return url.toString();
}

function publicView(current: GameState): PublicGameView {
  return {
    code: current.code,
    displayMode,
    revision: current.revision,
    status: current.status,
    phase: current.phase,
    players: current.players.map(({ id, name, color, symbol, connected, ready, position, lapsCompleted, turnsToSkip, capital, assetIds, leverIds, bankrupt, allianceId, mergedIntoId }) => ({
      id, name, color, symbol, connected, ready, position, lapsCompleted, turnsToSkip, capital, assetIds, leverCount: leverIds.length, bankrupt, allianceId, mergedIntoId,
      netWorth: getNetWorth(current, id),
      sectorInfluence: Object.fromEntries(SECTORS.map((sector) => [sector.id, getSectorInfluence(current, id, sector.id)])) as Record<(typeof SECTORS)[number]["id"], number>
    })),
    activePlayerId: current.activePlayerId,
    turnNumber: current.turnNumber,
    roundNumber: current.roundNumber,
    ownership: current.ownership,
    lastRoll: current.lastRoll,
    pendingAssetId: current.pendingAction?.availableAssetIds[0] ?? null,
    pendingPrice: null,
    pendingPurchase: current.pendingAction ? { source: current.pendingAction.source, countryId: current.pendingAction.countryId, resourceId: current.pendingAction.resourceId, label: current.pendingAction.label, availableAssetIds: current.pendingAction.availableAssetIds, maxAssets: current.pendingAction.maxAssets } : null,
    pendingLever: current.pendingLever ? { price: current.pendingLever.price } : null,
    pendingPayment: current.pendingPayment ? { ...current.pendingPayment, payableAmount: Math.min(current.players.find((player) => player.id === current.pendingPayment!.payerId)?.capital ?? 0, current.pendingPayment.amount) } : null,
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

function snapshot(events: GameEvent[] = [], includePlayer = true): StaticDemoSnapshot {
  if (!state) state = createScenarioState(scenario);
  const currentPlayer = state.players.find((player) => player.id === playerId)!;
  return {
    game: publicView(state),
    player: includePlayer ? { playerId, token: `static-demo-${playerId}`, isHost: playerId === "orion", allowedActions: actionsFor(state, playerId), leverIds: currentPlayer.leverIds, pendingLever: state.pendingLever?.playerId === playerId ? { leverId: state.pendingLever.leverId, price: state.pendingLever.price } : null } : null,
    events,
    scenario,
    playerId
  };
}

export function loadStaticDemo(mode: DisplayMode = "MOBILE_ONLY", includePlayer = true): StaticDemoSnapshot {
  displayMode = mode;
  if (!state && !restore()) state = createScenarioState(scenario);
  return snapshot([], includePlayer);
}

export function resetStaticDemo(nextScenario: StaticDemoScenarioId = scenario, mode: DisplayMode = displayMode, includePlayer = true): StaticDemoSnapshot {
  scenario = nextScenario;
  playerId = scenarioPlayers[nextScenario];
  displayMode = mode;
  state = createScenarioState(nextScenario);
  persist();
  return snapshot([], includePlayer);
}

export function selectStaticDemoPlayer(nextPlayerId: StaticDemoPlayerId): StaticDemoSnapshot {
  playerId = nextPlayerId;
  persist();
  return snapshot();
}

export function runStaticDemoCommand(event: string, payload?: unknown): { snapshot: StaticDemoSnapshot; data?: SessionResult } {
  if (!state) state = createScenarioState(scenario);
  const beforeRevision = state.revision;
  const input = (payload ?? {}) as Record<string, unknown>;

  switch (event) {
    case "lobby:set-ready": state = setPlayerReady(state, playerId, Boolean(input.ready)); break;
    case "game:start": state = startGame(state); break;
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
    case "admin:restart": state = restartGame(state); break;
    default: throw new Error(`Action statique inconnue : ${event}`);
  }

  const events = state.recentEvents.filter((item) => item.id > beforeRevision);
  persist();
  return { snapshot: snapshot(events) };
}
