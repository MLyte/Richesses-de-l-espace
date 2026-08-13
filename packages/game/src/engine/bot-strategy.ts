import { ASSETS } from "../data/assets";
import { LEVER_CARDS } from "../data/levers";
import { RESOURCES } from "../data/resources";
import type { AuctionState, BotProfile, GameState, PaymentDecision, PlayerState, PurchaseDecision, RaceShipId, TradeOffer } from "../types";
import { STARTING_CAPITAL } from "./game-engine";

type ObservedPlayer = Omit<PlayerState, "leverIds"> & { leverCount: number };

export interface BotObservation {
  phase: GameState["phase"];
  activePlayerId: string | null;
  players: ObservedPlayer[];
  ownership: GameState["ownership"];
  pendingAction: PurchaseDecision | null;
  pendingLever: { playerId: string; leverId: string; price: number } | null;
  pendingPayment: PaymentDecision | null;
  auction: AuctionState | null;
  tradeOffer: TradeOffer | null;
  ownLeverIds: string[];
}

export type BotDecision =
  | { type: "SELECT_STARTING_SHIP"; shipId: RaceShipId; reason: string }
  | { type: "ROLL"; reason: string }
  | { type: "BUY_ASSETS"; assetIds: string[]; reason: string }
  | { type: "PASS_ASSETS"; reason: string }
  | { type: "BUY_LEVER"; reason: string }
  | { type: "PASS_LEVER"; reason: string }
  | { type: "PAY"; reason: string }
  | { type: "DECLARE_BANKRUPTCY"; reason: string }
  | { type: "USE_LEVER"; leverId: string; reason: string }
  | { type: "SELECT_AUCTION_ASSETS"; assetIds: string[]; reason: string }
  | { type: "BID"; amount: number; reason: string }
  | { type: "PASS_BID"; reason: string }
  | { type: "RESPOND_TRADE"; accept: boolean; reason: string }
  | { type: "END_TURN"; reason: string };

const thinkingRanges: Record<BotDecision["type"], readonly [minimum: number, maximum: number]> = {
  SELECT_STARTING_SHIP: [650, 1_200],
  ROLL: [700, 1_400],
  BUY_ASSETS: [1_100, 2_200],
  PASS_ASSETS: [1_100, 2_200],
  BUY_LEVER: [1_000, 2_000],
  PASS_LEVER: [1_000, 2_000],
  PAY: [550, 900],
  DECLARE_BANKRUPTCY: [900, 1_600],
  USE_LEVER: [900, 1_600],
  SELECT_AUCTION_ASSETS: [1_200, 2_200],
  BID: [800, 1_500],
  PASS_BID: [800, 1_500],
  RESPOND_TRADE: [1_200, 2_200],
  END_TURN: [500, 850]
};

const thinkingTempo: Record<BotProfile, number> = {
  CAUTIOUS: 1.15,
  BALANCED: 1,
  AMBITIOUS: .9
};

export interface BotThinkingDelayOptions {
  minimumDelayMs?: number;
  random?: () => number;
}

/**
 * Adds a bounded, human-readable pause before a robot action. Mechanical
 * animations can provide a minimum duration so their time is never stacked
 * with an artificial thinking delay.
 */
export function getBotThinkingDelay(decision: BotDecision, profile: BotProfile, options: BotThinkingDelayOptions = {}): number {
  const [minimum, maximum] = thinkingRanges[decision.type];
  const tempo = thinkingTempo[profile];
  const randomValue = Math.min(1, Math.max(0, (options.random ?? Math.random)()));
  const sampledDelay = Math.round((minimum + (maximum - minimum) * randomValue) * tempo);
  return Math.max(Math.max(0, options.minimumDelayMs ?? 0), sampledDelay);
}

const assetById = new Map(ASSETS.map((asset) => [asset.id, asset]));
const resourceById = new Map(RESOURCES.map((resource) => [resource.id, resource]));
const thresholds = [30, 50, 70, 90] as const;

const settings: Record<BotProfile, { reserve: number; buyRatio: number; denialWeight: number; bidFactor: number; tradeMargin: number }> = {
  CAUTIOUS: { reserve: .3, buyRatio: 1.18, denialWeight: .04, bidFactor: .88, tradeMargin: .15 },
  BALANCED: { reserve: .2, buyRatio: 1.04, denialWeight: .1, bidFactor: 1, tradeMargin: .05 },
  AMBITIOUS: { reserve: .1, buyRatio: .9, denialWeight: .22, bidFactor: 1.12, tradeMargin: 0 }
};

export function observeGameForBot(state: GameState, botId: string): BotObservation {
  const ownPlayer = state.players.find((player) => player.id === botId);
  if (!ownPlayer) throw new Error("BOT_NOT_FOUND");
  return {
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    players: state.players.map(({ leverIds, ...player }) => ({ ...player, leverCount: leverIds.length })),
    ownership: { ...state.ownership },
    pendingAction: state.pendingAction ? { ...state.pendingAction, availableAssetIds: [...state.pendingAction.availableAssetIds] } : null,
    pendingLever: state.pendingLever?.playerId === botId ? { ...state.pendingLever } : null,
    pendingPayment: state.pendingPayment ? { ...state.pendingPayment } : null,
    auction: state.auction ? { ...state.auction, selectedAssetIds: [...state.auction.selectedAssetIds], lots: state.auction.lots.map((lot) => [...lot]), eligiblePlayerIds: [...state.auction.eligiblePlayerIds], passedPlayerIds: [...state.auction.passedPlayerIds] } : null,
    tradeOffer: state.tradeOffer ? { ...state.tradeOffer } : null,
    ownLeverIds: [...ownPlayer.leverIds]
  };
}

function influence(assetIds: readonly string[], resourceId: string): number {
  return assetIds.reduce((total, assetId) => total + (assetById.get(assetId)?.resourceId === resourceId ? assetById.get(assetId)!.sharePercent : 0), 0);
}

function royalty(resourceId: string, amount: number): number {
  const table = resourceById.get(resourceId)?.royalties;
  if (!table) return 0;
  if (amount >= 90) return table[90];
  if (amount >= 70) return table[70];
  if (amount >= 50) return table[50];
  if (amount >= 30) return table[30];
  return 0;
}

function portfolioUtility(assetIds: readonly string[]): number {
  const purchaseValue = assetIds.reduce((total, id) => total + (assetById.get(id)?.purchasePrice ?? 0), 0);
  const strategicValue = RESOURCES.reduce((total, resource) => {
    const share = influence(assetIds, resource.id);
    return total + royalty(resource.id, share) * 4 + share * .03;
  }, 0);
  return purchaseValue + strategicValue;
}

function opponentNearThreshold(observation: BotObservation, botId: string, resourceId: string): boolean {
  return observation.players.some((player) => {
    if (player.id === botId || player.bankrupt || player.mergedIntoId) return false;
    const share = influence(player.assetIds, resourceId);
    return thresholds.some((threshold) => share < threshold && threshold - share <= 15);
  });
}

function marginalAssetUtility(observation: BotObservation, botId: string, ownedIds: readonly string[], assetId: string, profile: BotProfile): number {
  const asset = assetById.get(assetId);
  if (!asset) return Number.NEGATIVE_INFINITY;
  const base = portfolioUtility([...ownedIds, assetId]) - portfolioUtility(ownedIds);
  const denial = opponentNearThreshold(observation, botId, asset.resourceId) ? asset.purchasePrice * settings[profile].denialWeight : 0;
  return base + denial;
}

function reserveFor(observation: BotObservation, profile: BotProfile): number {
  return (STARTING_CAPITAL[observation.players.length] ?? 100) * settings[profile].reserve;
}

function purchaseDecision(observation: BotObservation, botId: string, profile: BotProfile): BotDecision {
  const player = observation.players.find((item) => item.id === botId)!;
  const pending = observation.pendingAction!;
  const selected: string[] = [];
  let remaining = player.capital - reserveFor(observation, profile);
  let portfolio = [...player.assetIds];
  const candidates = [...pending.availableAssetIds].sort();
  while (selected.length < pending.maxAssets) {
    const affordable = candidates.filter((id) => !selected.includes(id) && (assetById.get(id)?.purchasePrice ?? Infinity) <= remaining);
    const ranked = affordable.map((id) => ({ id, score: marginalAssetUtility(observation, botId, portfolio, id, profile), price: assetById.get(id)!.purchasePrice }))
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    const best = ranked[0];
    if (!best || best.score < best.price * settings[profile].buyRatio) break;
    selected.push(best.id);
    portfolio.push(best.id);
    remaining -= best.price;
  }
  return selected.length
    ? { type: "BUY_ASSETS", assetIds: selected, reason: "BEST_AFFORDABLE_PORTFOLIO" }
    : { type: "PASS_ASSETS", reason: "NO_PURCHASE_ABOVE_THRESHOLD" };
}

function auctionSelection(observation: BotObservation, botId: string): BotDecision {
  const player = observation.players.find((item) => item.id === botId)!;
  const groups = RESOURCES.map((resource) => player.assetIds.filter((id) => assetById.get(id)?.resourceId === resource.id))
    .filter((ids) => ids.length)
    .sort((left, right) => left[0]!.localeCompare(right[0]!));
  const target = observation.auction!.targetCount;
  type Candidate = { groups: string[][]; count: number; minimumGroupSize: number; utility: number };
  let frontier: Candidate[] = [{ groups: [], count: 0, minimumGroupSize: 7, utility: 0 }];
  const completed: Candidate[] = [];
  for (const group of groups) {
    const additions: Candidate[] = [];
    for (const candidate of frontier) {
      const next = { groups: [...candidate.groups, group], count: candidate.count + group.length, minimumGroupSize: Math.min(candidate.minimumGroupSize, group.length), utility: candidate.utility + portfolioUtility(group) };
      if (next.count >= target) {
        if (next.count - next.minimumGroupSize < target) completed.push(next);
      } else additions.push(next);
    }
    const bestByShape = new Map<string, Candidate>();
    for (const candidate of [...frontier, ...additions]) {
      const key = `${candidate.count}:${candidate.minimumGroupSize}`;
      const current = bestByShape.get(key);
      if (!current || candidate.utility < current.utility) bestByShape.set(key, candidate);
    }
    frontier = [...bestByShape.values()];
  }
  const best = completed.sort((left, right) => left.utility - right.utility || left.count - right.count || left.groups.flat()[0]!.localeCompare(right.groups.flat()[0]!))[0];
  return { type: "SELECT_AUCTION_ASSETS", assetIds: best?.groups.flat() ?? [], reason: "LOWEST_VALUE_COMPLETE_GROUPS" };
}

function auctionDecision(observation: BotObservation, botId: string, profile: BotProfile): BotDecision | null {
  const auction = observation.auction!;
  if (!auction.eligiblePlayerIds.includes(botId) || auction.passedPlayerIds.includes(botId) || auction.leaderId === botId) return null;
  const player = observation.players.find((item) => item.id === botId)!;
  const lot = auction.lots[auction.currentLotIndex] ?? [];
  const value = portfolioUtility([...player.assetIds, ...lot]) - portfolioUtility(player.assetIds);
  const spendable = Math.max(0, player.capital - reserveFor(observation, profile));
  const ceiling = Math.min(spendable, value * settings[profile].bidFactor);
  const minimum = auction.currentBid ? auction.currentBid + 1 : auction.minimumBid;
  const wholeCreditCeiling = Math.round(ceiling);
  return minimum <= wholeCreditCeiling
    ? { type: "BID", amount: minimum, reason: "BID_WITHIN_VALUE_CEILING" }
    : { type: "PASS_BID", reason: "BID_EXCEEDS_VALUE_CEILING" };
}

function tradeDecision(observation: BotObservation, botId: string, profile: BotProfile): BotDecision | null {
  const offer = observation.tradeOffer;
  if (!offer || offer.targetId !== botId) return offer?.proposerId === botId ? { type: "RESPOND_TRADE", accept: false, reason: "BOTS_DO_NOT_INITIATE_TRADES" } : null;
  if (offer.kind === "alliance") return { type: "RESPOND_TRADE", accept: false, reason: "ALLIANCES_DISABLED_FOR_BOTS" };
  const bot = observation.players.find((item) => item.id === botId)!;
  const proposer = observation.players.find((item) => item.id === offer.proposerId)!;
  const received = offer.offeredResourceId ? proposer.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.offeredResourceId) : [];
  const surrendered = offer.requestedResourceId ? bot.assetIds.filter((id) => assetById.get(id)?.resourceId === offer.requestedResourceId) : [];
  const afterCapital = bot.capital - offer.requestedCredits + offer.offeredCredits;
  if (afterCapital < reserveFor(observation, profile)) return { type: "RESPOND_TRADE", accept: false, reason: "TRADE_BREAKS_CAPITAL_RESERVE" };
  const afterAssets = [...bot.assetIds.filter((id) => !surrendered.includes(id)), ...received];
  const before = bot.capital + portfolioUtility(bot.assetIds);
  const after = afterCapital + portfolioUtility(afterAssets);
  const transferredValue = Math.max(1, portfolioUtility([...received, ...surrendered]));
  const accept = after - before >= transferredValue * settings[profile].tradeMargin;
  return { type: "RESPOND_TRADE", accept, reason: accept ? "TRADE_IMPROVES_POSITION" : "TRADE_MARGIN_TOO_LOW" };
}

export function decideBotAction(observation: BotObservation, botId: string, profile: BotProfile): BotDecision | null {
  const player = observation.players.find((item) => item.id === botId);
  if (!player || player.bankrupt || player.mergedIntoId || observation.phase === "LOBBY" || observation.phase === "PAUSED" || observation.phase === "FINISHED") return null;
  if (observation.phase === "WAITING_FOR_TRADE") return tradeDecision(observation, botId, profile);
  if (observation.phase === "AUCTION" && observation.auction?.mode === "bidding") return auctionDecision(observation, botId, profile);
  if (observation.phase === "AUCTION" && observation.auction?.mode === "selection" && observation.auction.sellerId === botId) {
    const exemption = observation.ownLeverIds.find((id) => LEVER_CARDS.find((card) => card.id === id)?.kind === "auction_exemption");
    return exemption ? { type: "USE_LEVER", leverId: exemption, reason: "AVOID_FORCED_AUCTION" } : auctionSelection(observation, botId);
  }
  if (observation.activePlayerId !== botId) return null;
  if (observation.phase === "WAITING_FOR_ROLL") return { type: "ROLL", reason: "MANDATORY_ROLL" };
  if (observation.phase === "WAITING_FOR_PURCHASE" && observation.pendingAction?.playerId === botId) return purchaseDecision(observation, botId, profile);
  if (observation.phase === "WAITING_FOR_LEVER_PURCHASE" && observation.pendingLever?.playerId === botId) {
    const minimumAssets = profile === "CAUTIOUS" ? 2 : profile === "BALANCED" ? 1 : 0;
    const affordable = player.capital - observation.pendingLever.price >= reserveFor(observation, profile);
    return affordable && player.assetIds.length >= minimumAssets ? { type: "BUY_LEVER", reason: "TECHNOLOGY_IS_AFFORDABLE" } : { type: "PASS_LEVER", reason: "TECHNOLOGY_BELOW_PRIORITY" };
  }
  if (observation.phase === "WAITING_FOR_PAYMENT" && observation.pendingPayment?.payerId === botId) {
    return player.capital >= observation.pendingPayment.amount ? { type: "PAY", reason: "PAYMENT_IS_AFFORDABLE" } : { type: "DECLARE_BANKRUPTCY", reason: "INSOLVENT_WITHOUT_BOT_LIQUIDATION" };
  }
  if (observation.phase === "WAITING_FOR_END_TURN") return { type: "END_TURN", reason: "MANDATORY_END_TURN" };
  return null;
}
