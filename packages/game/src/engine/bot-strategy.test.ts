import { describe, expect, it } from "vitest";
import { ASSETS } from "../data/assets";
import { LEVER_CARDS } from "../data/levers";
import type { GameState } from "../types";
import { STARTING_RACE_SHIPS, addPlayer, buyPendingAsset, buyPendingLever, createGame, declareBankruptcy, endTurn, finishStartingRace, passAuction, passPendingAsset, passPendingLever, payPendingPayment, placeBid, respondToTrade, rollDice, selectAuctionAssets, selectStartingShip, setPlayerReady, startGame, useLever } from "./game-engine";
import { decideBotAction, observeGameForBot, type BotDecision } from "./bot-strategy";

function completeStartingRace(state: GameState): GameState {
  let next = startGame(state);
  for (const [index, player] of next.players.entries()) next = selectStartingShip(next, player.id, STARTING_RACE_SHIPS[index]!, 0);
  return finishStartingRace(next);
}

function startedGame(): GameState {
  let state = createGame("game", "BOT1", 42);
  state = addPlayer(state, { id: "human", name: "Aline", color: "#e05f42", symbol: "cat" });
  state = addPlayer(state, { id: "bot", name: "Nova", color: "#3784a6", symbol: "dog" });
  state = setPlayerReady(state, "human", true);
  state = setPlayerReady(state, "bot", true);
  return completeStartingRace(state);
}

function botTurn(state = startedGame()): GameState {
  return { ...state, activePlayerId: "bot", phase: "WAITING_FOR_ROLL" };
}

function applyDecision(state: GameState, playerId: string, decision: BotDecision): GameState {
  switch (decision.type) {
    case "SELECT_STARTING_SHIP": return selectStartingShip(state, playerId, decision.shipId);
    case "ROLL": return rollDice(state, playerId);
    case "BUY_ASSETS": return buyPendingAsset(state, playerId, decision.assetIds);
    case "PASS_ASSETS": return passPendingAsset(state, playerId);
    case "BUY_LEVER": return buyPendingLever(state, playerId);
    case "PASS_LEVER": return passPendingLever(state, playerId);
    case "PAY": return payPendingPayment(state, playerId);
    case "DECLARE_BANKRUPTCY": return declareBankruptcy(state, playerId);
    case "USE_LEVER": return useLever(state, playerId, decision.leverId);
    case "SELECT_AUCTION_ASSETS": return selectAuctionAssets(state, playerId, decision.assetIds);
    case "BID": return placeBid(state, playerId, decision.amount);
    case "PASS_BID": return passAuction(state, playerId);
    case "RESPOND_TRADE": return respondToTrade(state, playerId, decision.accept);
    case "END_TURN": return endTurn(state, playerId);
  }
}

function simulatedTable(playerCount: number): GameState {
  let state = createGame(`simulation-${playerCount}`, `SIM${playerCount}`, 1_337 + playerCount);
  for (let index = 0; index < playerCount; index += 1) {
    state = addPlayer(state, { id: `p${index}`, name: `Joueur ${index}`, color: `color-${index}`, symbol: `symbol-${index}` });
    state = setPlayerReady(state, `p${index}`, true);
  }
  return completeStartingRace(state);
}

describe("bot strategy", () => {
  it("uses a public observation and cannot react to an opponent's hidden Technologies", () => {
    const firstLever = LEVER_CARDS[0]!.id;
    const secondLever = LEVER_CARDS[1]!.id;
    const base = botTurn();
    const first = { ...base, players: base.players.map((player) => player.id === "human" ? { ...player, leverIds: [firstLever] } : { ...player, leverIds: [secondLever] }) };
    const changed = { ...first, players: first.players.map((player) => player.id === "human" ? { ...player, leverIds: [secondLever, firstLever] } : player) };
    const observation = observeGameForBot(first, "bot");

    expect(observation.players.every((player) => !("leverIds" in player))).toBe(true);
    expect(observation.ownLeverIds).toEqual([secondLever]);
    expect(decideBotAction(observation, "bot", "BALANCED")).toEqual(decideBotAction(observeGameForBot(changed, "bot"), "bot", "BALANCED"));
  });

  it("applies distinct capital reserves to cautious and ambitious purchases", () => {
    const asset = ASSETS[0]!;
    const base = botTurn();
    const state: GameState = {
      ...base,
      phase: "WAITING_FOR_PURCHASE",
      players: base.players.map((player) => player.id === "bot" ? { ...player, capital: asset.purchasePrice + 15 } : player),
      pendingAction: { type: "purchase", source: "classic", playerId: "bot", countryId: asset.worldId, resourceId: asset.resourceId, label: asset.name, availableAssetIds: [asset.id], maxAssets: 1 }
    };
    const observation = observeGameForBot(state, "bot");

    expect(decideBotAction(observation, "bot", "CAUTIOUS")?.type).toBe("PASS_ASSETS");
    expect(decideBotAction(observation, "bot", "AMBITIOUS")).toMatchObject({ type: "BUY_ASSETS", assetIds: [asset.id] });
  });

  it("selects affordable concessions greedily without exceeding the case limit", () => {
    const available = ASSETS.slice(0, 10);
    const base = botTurn();
    const state: GameState = {
      ...base,
      phase: "WAITING_FOR_PURCHASE",
      players: base.players.map((player) => player.id === "bot" ? { ...player, capital: 100 } : player),
      pendingAction: { type: "purchase", source: "global", playerId: "bot", countryId: null, resourceId: null, label: "Galaxie", availableAssetIds: available.map((asset) => asset.id), maxAssets: 3 }
    };
    const decision = decideBotAction(observeGameForBot(state, "bot"), "bot", "AMBITIOUS");

    expect(decision?.type).toBe("BUY_ASSETS");
    if (decision?.type === "BUY_ASSETS") {
      expect(decision.assetIds.length).toBeGreaterThan(0);
      expect(decision.assetIds.length).toBeLessThanOrEqual(3);
      expect(decision.assetIds.every((id) => available.some((asset) => asset.id === id))).toBe(true);
    }
  });

  it("keeps resource groups indivisible in a minimal forced-auction selection", () => {
    const firstGroup = ASSETS.filter((asset) => asset.resourceId === ASSETS[0]!.resourceId).slice(0, 2);
    const extra = ASSETS.find((asset) => asset.resourceId !== firstGroup[0]!.resourceId)!;
    const base = botTurn();
    const owned = [...firstGroup, extra];
    const state: GameState = {
      ...base,
      phase: "AUCTION",
      players: base.players.map((player) => player.id === "bot" ? { ...player, assetIds: owned.map((asset) => asset.id) } : player),
      ownership: Object.fromEntries(owned.map((asset) => [asset.id, "bot"])),
      auction: { mode: "selection", sellerId: "bot", bankSale: false, targetCount: 2, redDie: 2, assetId: firstGroup[0]!.id, selectedAssetIds: [], lots: [], currentLotIndex: 0, minimumBid: 0, currentBid: 0, leaderId: null, eligiblePlayerIds: ["human"], passedPlayerIds: [], deadline: null }
    };
    const decision = decideBotAction(observeGameForBot(state, "bot"), "bot", "BALANCED");

    expect(decision).toMatchObject({ type: "SELECT_AUCTION_ASSETS", assetIds: firstGroup.map((asset) => asset.id) });
  });

  it("uses an auction exemption before sacrificing concessions", () => {
    const asset = ASSETS[0]!;
    const leverId = LEVER_CARDS[0]!.id;
    const base = botTurn();
    const state: GameState = {
      ...base,
      phase: "AUCTION",
      players: base.players.map((player) => player.id === "bot" ? { ...player, assetIds: [asset.id], leverIds: [leverId] } : player),
      ownership: { [asset.id]: "bot" },
      auction: { mode: "selection", sellerId: "bot", bankSale: false, targetCount: 1, redDie: 1, assetId: asset.id, selectedAssetIds: [], lots: [], currentLotIndex: 0, minimumBid: 0, currentBid: 0, leaderId: null, eligiblePlayerIds: ["human"], passedPlayerIds: [], deadline: null }
    };

    expect(decideBotAction(observeGameForBot(state, "bot"), "bot", "BALANCED")).toMatchObject({ type: "USE_LEVER", leverId });
  });

  it("bids only within its profile ceiling", () => {
    const lot = [ASSETS[0]!.id];
    const base = botTurn();
    const state: GameState = {
      ...base,
      phase: "AUCTION",
      players: base.players.map((player) => player.id === "bot" ? { ...player, capital: 100 } : player),
      auction: { mode: "bidding", sellerId: "human", bankSale: false, targetCount: 1, redDie: 1, assetId: lot[0]!, selectedAssetIds: lot, lots: [lot], currentLotIndex: 0, minimumBid: 1, currentBid: 0, leaderId: null, eligiblePlayerIds: ["bot"], passedPlayerIds: [], deadline: Date.now() + 10_000 }
    };
    const affordable = decideBotAction(observeGameForBot(state, "bot"), "bot", "BALANCED");
    const expensiveState = { ...state, auction: { ...state.auction!, currentBid: 99 } };

    expect(affordable).toMatchObject({ type: "BID", amount: 1 });
    expect(decideBotAction(observeGameForBot(expensiveState, "bot"), "bot", "BALANCED")?.type).toBe("PASS_BID");
  });

  it("accepts a favorable ordinary trade and always rejects an alliance", () => {
    const asset = ASSETS[0]!;
    const base = botTurn();
    const tradeBase: GameState = {
      ...base,
      phase: "WAITING_FOR_TRADE",
      players: base.players.map((player) => player.id === "human" ? { ...player, assetIds: [asset.id] } : { ...player, capital: 100 }),
      ownership: { [asset.id]: "human" },
      tradeOffer: { id: "trade", proposerId: "human", targetId: "bot", kind: "trade", offeredResourceId: asset.resourceId, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0, returnPhase: "WAITING_FOR_END_TURN" }
    };
    const alliance = { ...tradeBase, tradeOffer: { ...tradeBase.tradeOffer!, id: "alliance", kind: "alliance" as const, offeredResourceId: null, allianceTax: 0 } };

    expect(decideBotAction(observeGameForBot(tradeBase, "bot"), "bot", "BALANCED")).toMatchObject({ type: "RESPOND_TRADE", accept: true });
    expect(decideBotAction(observeGameForBot(alliance, "bot"), "bot", "BALANCED")).toMatchObject({ type: "RESPOND_TRADE", accept: false });
  });

  it.each([2, 6])("runs a deterministic %i-player table without a blocked phase", (playerCount) => {
    let state = simulatedTable(playerCount);
    const profiles = ["CAUTIOUS", "BALANCED", "AMBITIOUS"] as const;
    const initialRevision = state.revision;
    for (let step = 0; step < 500 && state.phase !== "FINISHED"; step += 1) {
      const actor = state.players.map((player, index) => ({ player, decision: decideBotAction(observeGameForBot(state, player.id), player.id, profiles[index % profiles.length]!) }))
        .find((candidate) => candidate.decision);
      expect(actor, `phase bloquée à l’étape ${step}: ${state.phase}`).toBeDefined();
      state = applyDecision(state, actor!.player.id, actor!.decision!);
    }
    expect(state.revision).toBeGreaterThan(initialRevision + 100);
    expect(state.phase).not.toBe("PAUSED");
  });
});
