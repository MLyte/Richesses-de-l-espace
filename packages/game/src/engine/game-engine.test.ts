import { describe, expect, it } from "vitest";
import { ASSETS } from "../data/assets";
import { BOARD } from "../data/board";
import { COUNTRIES } from "../data/countries";
import { LEVER_CARDS } from "../data/levers";
import { TREND_CARDS } from "../data/trends";
import type { GameState } from "../types";
import { AUCTION_BID_GRACE_MS, AUCTION_INITIAL_DURATION_MS, STARTING_RACE_DURATION_MS, STARTING_RACE_SHIPS, addPlayer, buyPendingAsset, buyPendingLever, closeExpiredAuction, createGame, declareBankruptcy, endTurn, finishGame, finishStartingRace, getCurrentPrice, getPaymentAmount, getRoyaltyAmount, passAuction, passPendingAsset, passPendingLever, payPendingPayment, pauseGame, placeBid, proposeTrade, respondToTrade, restartGame, resumeGame, rollDice, selectAuctionAssets, selectStartingShip, setPlayerReady, startGame, useLever } from "./game-engine";

function startTurns(state: GameState): GameState {
  let next = startGame(state);
  for (const [index, player] of next.players.entries()) next = selectStartingShip(next, player.id, STARTING_RACE_SHIPS[index]!, 0);
  next = finishStartingRace(next);
  return { ...next, activePlayerId: next.players[0]!.id };
}

function startedGame() {
  let game = createGame("game", "TEST", 1);
  game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "cat" });
  game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "dog" });
  game = setPlayerReady(game, "p1", true);
  game = setPlayerReady(game, "p2", true);
  return startTurns(game);
}

function startedGameWithThree() {
  let game = createGame("game", "TEST", 1);
  game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "cat" });
  game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "dog" });
  game = addPlayer(game, { id: "p3", name: "Chloé", color: "#75a341", symbol: "bird" });
  game = setPlayerReady(game, "p1", true); game = setPlayerReady(game, "p2", true); game = setPlayerReady(game, "p3", true);
  return startTurns(game);
}

function landOn(index: number) {
  const preview = rollDice(startedGame(), "p1");
  const total = preview.lastRoll!.total;
  const game = startedGame();
  return rollDice({ ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, position: (index - total + BOARD.length) % BOARD.length } : player) }, "p1");
}

function landOnSpace(game: GameState, spaceId: string) {
  const preview = rollDice(game, "p1"); const total = preview.lastRoll!.total;
  const index = BOARD.findIndex((space) => space.id === spaceId);
  return rollDice({ ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, position: (index - total + BOARD.length) % BOARD.length } : player) }, "p1");
}

describe("Richesses de l’espace game engine", () => {
  it("races only the selected ships and lets the first finisher start", () => {
    let game = createGame("race", "RACE", 91);
    game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "cat" });
    game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "dog" });
    game = setPlayerReady(setPlayerReady(game, "p1", true), "p2", true);
    game = startGame(game);
    expect(game).toMatchObject({ phase: "SHIP_SELECTION", activePlayerId: null });
    game = selectStartingShip(game, "p1", "inner-system", 1_000);
    expect(() => selectStartingShip(game, "p2", "inner-system", 1_000)).toThrowError(/choisi/);
    game = selectStartingShip(game, "p2", "stellar-farlands", 1_000);
    expect(game.phase).toBe("SHIP_RACE");
    expect(game.startingRace.finishOrder).toHaveLength(game.players.length);
    expect(new Set(game.startingRace.finishOrder).size).toBe(game.players.length);
    expect(game.startingRace.finishOrder).toEqual(expect.arrayContaining(["inner-system", "stellar-farlands"]));
    const selectedRanking = game.startingRace.finishOrder.filter((shipId) => Object.values(game.startingRace.selections).includes(shipId));
    const expectedWinnerId = Object.entries(game.startingRace.selections).find(([, shipId]) => shipId === selectedRanking[0])?.[0];
    expect(game.startingRace.winnerPlayerId).toBe(expectedWinnerId);
    game = finishStartingRace(game);
    expect(game).toMatchObject({ phase: "WAITING_FOR_ROLL", activePlayerId: expectedWinnerId });
    expect(game.recentEvents.find((event) => event.type === "ship_race_finished")?.playerId).toBe(expectedWinnerId);
  });

  it("freezes the opening race while the game is paused", () => {
    let game = createGame("paused-race", "PAUS", 17);
    game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "cat" });
    game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "dog" });
    game = startGame(setPlayerReady(setPlayerReady(game, "p1", true), "p2", true));
    game = selectStartingShip(game, "p1", "inner-system", 1_000);
    game = selectStartingShip(game, "p2", "red-belt", 1_000);
    expect(game.startingRace.raceEndsAt).toBe(1_000 + STARTING_RACE_DURATION_MS);
    game = pauseGame(game, "ADMIN", null, 2_000);
    game = resumeGame(game, 5_000);
    expect(game).toMatchObject({ phase: "SHIP_RACE", startingRace: { raceEndsAt: 4_000 + STARTING_RACE_DURATION_MS, pausedAt: null } });
  });

  it("starts with two ready players", () => {
    const game = startedGame();
    expect(game.phase).toBe("WAITING_FOR_ROLL");
    expect(game.activePlayerId).toBe("p1");
    expect(game.players.every((player) => player.capital === 100)).toBe(true);
    expect(game.recentEvents.find((event) => event.type === "game_started")?.data).toMatchObject({ startingCapital: 100, bankDirection: "bank_to_player" });
  });

  it("rolls on the server and resolves the destination", () => {
    const game = rollDice(startedGame(), "p1");
    expect(game.lastRoll?.total).toBeGreaterThanOrEqual(2);
    expect(game.players[0]?.position).toBe(game.lastRoll?.total);
    expect(game.recentEvents.find((event) => event.type === "pawn_moved")?.data).toMatchObject({ from: 0, to: game.lastRoll?.total, steps: game.lastRoll?.total });
    expect(["WAITING_FOR_PURCHASE", "WAITING_FOR_END_TURN"]).toContain(game.phase);
  });

  it("always records and explains the landed space, including the central hub", () => {
    let game = landOn(0);
    expect(game.landedSpaceId).toBe("hub-zero");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.recentEvents.at(-1)).toMatchObject({ type: "space_landed", data: { spaceId: "hub-zero", spaceType: "hub" } });
    expect(game.recentEvents.at(-1)?.message).toContain("aucun effet");
    game = endTurn(game, "p1");
    expect(game.landedSpaceId).toBeNull();
  });

  it("purchases several available titles from the country catalogue", () => {
    let game = startedGame();
    const initialCapital = game.players[0]!.capital;
    const titles = ASSETS.filter((asset) => asset.worldId === "mercure").slice(0, 3);
    game = { ...game, phase: "WAITING_FOR_PURCHASE", pendingAction: { type: "purchase", source: "classic", playerId: "p1", countryId: "mercure", resourceId: "aluminous-regolith", label: "Mercure", availableAssetIds: titles.map((title) => title.id), maxAssets: 6 } };
    game = buyPendingAsset(game, "p1", titles.map((title) => title.id));
    expect(game.players[0]?.capital).toBe(initialCapital - titles.reduce((total, title) => total + title.basePrice, 0));
    expect(titles.every((title) => game.ownership[title.id] === "p1")).toBe(true);
    expect(game.recentEvents.find((event) => event.type === "asset_purchased")?.data).toMatchObject({ bankDirection: "player_to_bank", amount: titles.reduce((total, title) => total + title.basePrice, 0) });
  });

  it("never reverses the bank direction of an Actualité card", () => {
    for (const card of TREND_CARDS) {
      let initial = startedGameWithThree();
      initial = { ...initial, trendDeck: [card.id] };
      const capitalBefore = initial.players[0]!.capital;
      const game = landOnSpace(initial, "observatory-north");
      const [red, white] = game.lastRoll!.dice;
      const capitalAfterDouble = capitalBefore - (red === white ? red : 0);
      const expected = card.bankDirection === "bank_to_player" ? capitalAfterDouble + card.amount : capitalAfterDouble - card.amount;
      expect(game.players[0]!.capital, card.title).toBe(expected);
      expect(game.recentEvents.find((event) => event.type === "trend_drawn")?.data, card.title).toMatchObject({ bankDirection: card.bankDirection, amount: card.amount, appliedAmount: card.amount, shortfall: 0 });
    }
  });

  it("declares bankruptcy when an Actualité payment to the bank is unaffordable", () => {
    const card = TREND_CARDS.find((candidate) => candidate.id === "orbital-maintenance")!;
    let initial = startedGameWithThree();
    initial = {
      ...initial,
      trendDeck: [card.id],
      players: initial.players.map((player) => player.id === "p1" ? { ...player, capital: 1 } : player)
    };
    const game = landOnSpace(initial, "observatory-north");
    expect(game.players.find((player) => player.id === "p1")).toMatchObject({ capital: 0, bankrupt: true });
    expect(game.phase).toBe("WAITING_FOR_ROLL");
    expect(game.activePlayerId).toBe("p2");
    expect(game.recentEvents.find((event) => event.type === "trend_drawn")?.data).toMatchObject({ bankDirection: "player_to_bank", amount: 2, appliedAmount: 0, shortfall: 1 });
    expect(game.recentEvents.find((event) => event.type === "player_bankrupt")?.data).toMatchObject({ amount: 2, creditorCompensation: 0, debtToBank: 2 });
  });

  it("pays every qualified holder before offering purchases from the country", () => {
    const featured = ASSETS.find((asset) => asset.resourceId === "hydroponic-crops" && asset.share === 30)!;
    const space = BOARD.find((item) => item.type === "asset" && item.resourceId === featured.resourceId);
    if (!space || space.type !== "asset") throw new Error("Case Blé introuvable dans le référentiel de test.");
    let initial = startedGame();
    initial = { ...initial, players: initial.players.map((player) => player.id === "p2" ? { ...player, assetIds: [featured.id] } : player), ownership: { [featured.id]: "p2" } };
    let game = landOnSpace(initial, space.id);
    expect(game.phase).toBe("WAITING_FOR_PAYMENT");
    expect(game.pendingAction?.countryId).toBe(space.worldId);
    expect(game.pendingAction?.availableAssetIds).not.toContain(featured.id);
    expect(game.pendingPayment).toMatchObject({ recipientId: "p2", resourceId: featured.resourceId });
    expect(game.recentEvents.some((event) => event.type === "purchase_offered")).toBe(false);
    game = payPendingPayment(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_PURCHASE");
    expect(game.recentEvents.at(-1)?.type).toBe("purchase_offered");
    game = passPendingAsset(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
  });

  it("queues royalties for every other player holding at least 30 percent", () => {
    const titles = ASSETS.filter((asset) => asset.resourceId === "hydroponic-crops");
    const p2Titles = titles.filter((asset) => asset.share === 30);
    const p3Titles = [titles.find((asset) => asset.share === 5)!, titles.find((asset) => asset.share === 25)!];
    let game = startedGameWithThree();
    game = {
      ...game,
      players: game.players.map((player) => player.id === "p2" ? { ...player, assetIds: p2Titles.map(({ id }) => id) } : player.id === "p3" ? { ...player, assetIds: p3Titles.map(({ id }) => id) } : player),
      ownership: Object.fromEntries([...p2Titles.map(({ id }) => [id, "p2"]), ...p3Titles.map(({ id }) => [id, "p3"])])
    };
    const space = BOARD.find((item) => item.type === "asset" && item.resourceId === "hydroponic-crops")!;
    game = landOnSpace(game, space.id);
    expect(game.pendingPayment?.recipientId).toBe("p2");
    expect(game.paymentQueue.map((payment) => payment.recipientId)).toEqual(["p3"]);
    game = payPendingPayment(game, "p1");
    expect(game.pendingPayment?.recipientId).toBe("p3");
    game = payPendingPayment(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_PURCHASE");
    game = passPendingAsset(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
  });

  it("offers the country catalogue immediately when no royalty is due", () => {
    const featured = ASSETS.find((asset) => asset.resourceId === "hydroponic-crops" && asset.share === 25)!;
    const space = BOARD.find((item) => item.type === "asset" && item.resourceId === featured.resourceId);
    if (!space || space.type !== "asset") throw new Error("Case Blé introuvable dans le référentiel de test.");
    let initial = startedGame();
    initial = { ...initial, players: initial.players.map((player) => player.id === "p2" ? { ...player, assetIds: [featured.id] } : player), ownership: { [featured.id]: "p2" } };
    const game = landOnSpace(initial, space.id);
    expect(game.phase).toBe("WAITING_FOR_PURCHASE");
    expect(game.pendingPayment).toBeNull();
    expect(game.pendingAction?.countryId).toBe(space.worldId);
    expect(game.recentEvents.at(-1)?.type).toBe("purchase_offered");
  });

  it("does not offer a purchase when royalties bankrupt the active player", () => {
    const featured = ASSETS.find((asset) => asset.resourceId === "hydroponic-crops" && asset.share === 30)!;
    const space = BOARD.find((item) => item.type === "asset" && item.resourceId === featured.resourceId);
    if (!space || space.type !== "asset") throw new Error("Case Blé introuvable dans le référentiel de test.");
    let initial = startedGameWithThree();
    initial = { ...initial, players: initial.players.map((player) => player.id === "p2" ? { ...player, assetIds: [featured.id] } : player), ownership: { [featured.id]: "p2" } };
    const preview = landOnSpace(initial, space.id);
    const [red, white] = preview.lastRoll!.dice;
    const doubleTax = red === white ? red : 0;
    const royalty = getPaymentAmount(initial, featured, "p2");
    initial = { ...initial, players: initial.players.map((player) => player.id === "p1" ? { ...player, capital: doubleTax + royalty - 0.5 } : player) };
    let game = landOnSpace(initial, space.id);
    expect(game.phase).toBe("WAITING_FOR_PAYMENT");
    expect(game.pendingAction).not.toBeNull();
    game = declareBankruptcy(game, "p1");
    expect(game.pendingAction).toBeNull();
    expect(game.recentEvents.some((event) => event.type === "purchase_offered")).toBe(false);
  });

  it("pays nothing below 30 percent of the resource", () => {
    const title = ASSETS.find((asset) => asset.resourceId === "hydroponic-crops" && asset.share === 25)!;
    const game = { ...startedGame(), players: startedGame().players.map((player) => player.id === "p2" ? { ...player, assetIds: [title.id] } : player) };
    expect(getPaymentAmount(game, title, "p2")).toBe(0);
  });

  it("applies the exact 29/30/49/50/69/70/89/90 percent thresholds", () => {
    const resource = ASSETS[0]!.resourceId;
    expect([29, 49, 69, 89].map((share) => getRoyaltyAmount(resource, share))).toEqual([
      0,
      getRoyaltyAmount(resource, 30),
      getRoyaltyAmount(resource, 50),
      getRoyaltyAmount(resource, 70)
    ]);
    expect(getRoyaltyAmount(resource, 30)).toBeGreaterThan(0);
    expect(getRoyaltyAmount(resource, 50)).toBeGreaterThan(getRoyaltyAmount(resource, 49));
    expect(getRoyaltyAmount(resource, 70)).toBeGreaterThan(getRoyaltyAmount(resource, 69));
    expect(getRoyaltyAmount(resource, 90)).toBeGreaterThan(getRoyaltyAmount(resource, 89));
  });

  it("charges the bank tax on a double without granting another turn", () => {
    let game = createGame("double", "DBLE", 10);
    game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "star" });
    game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "diamond" });
    game = setPlayerReady(setPlayerReady(game, "p1", true), "p2", true);
    game = { ...startTurns(game), rngState: 10 };
    const destinationIndex = BOARD.findIndex((space, index) => index > 4 && space.type === "asset");
    game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, position: destinationIndex - 4 } : player) };
    const capitalBefore = game.players[0]!.capital;
    game = rollDice(game, "p1");
    expect(game.lastRoll?.dice).toEqual([2, 2]);
    expect(game.players[0]?.capital).toBe(capitalBefore - 2);
    expect(game.recentEvents.find((event) => event.type === "double_tax_paid")?.data).toMatchObject({ bankDirection: "player_to_bank", amount: 2, appliedAmount: 2, shortfall: 0 });
  });

  it("declares bankruptcy instead of silently truncating an unaffordable double tax", () => {
    let game = createGame("double-bankruptcy", "DBKR", 10);
    game = addPlayer(game, { id: "p1", name: "Aline", color: "#e05f42", symbol: "star" });
    game = addPlayer(game, { id: "p2", name: "Basile", color: "#3784a6", symbol: "diamond" });
    game = setPlayerReady(setPlayerReady(game, "p1", true), "p2", true);
    game = { ...startTurns(game), rngState: 10 };
    game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1 } : player) };
    game = rollDice(game, "p1");
    expect(game.lastRoll?.dice).toEqual([2, 2]);
    expect(game.players.find((player) => player.id === "p1")).toMatchObject({ capital: 0, bankrupt: true, position: 0 });
    expect(game.phase).toBe("FINISHED");
    expect(game.winnerId).toBe("p2");
    expect(game.recentEvents.find((event) => event.type === "double_tax_paid")?.data).toMatchObject({ bankDirection: "player_to_bank", amount: 2, appliedAmount: 0, shortfall: 1 });
  });

  it("requires and transfers a retombée before ending the turn", () => {
    const asset = ASSETS[0]!;
    let game = startedGame();
    game = {
      ...game,
      phase: "WAITING_FOR_PAYMENT",
      ownership: { [asset.id]: "p2" },
      players: game.players.map((player) => player.id === "p2" ? { ...player, assetIds: [asset.id] } : player),
      pendingPayment: { type: "payment", payerId: "p1", recipientId: "p2", assetId: asset.id, resourceId: asset.resourceId, amount: 2 }
    };
    expect(() => endTurn(game, "p1")).toThrowError(/n’est pas terminé/);
    game = payPendingPayment(game, "p1");
    expect(game.players.find((player) => player.id === "p1")?.capital).toBe(98);
    expect(game.players.find((player) => player.id === "p2")?.capital).toBe(102);
    expect(game.players.reduce((total, player) => total + player.capital, 0)).toBe(200);
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.recentEvents.at(-1)?.type).toBe("payment_completed");
    expect(game.recentEvents.at(-1)?.data).not.toHaveProperty("bankDirection");
  });

  it("lets the bank assume an insolvent debt and auction the returned titles", () => {
    const asset = ASSETS[0]!;
    let game = startedGameWithThree();
    game = {
      ...game,
      phase: "WAITING_FOR_PAYMENT",
      ownership: { [asset.id]: "p1" },
      players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1, assetIds: [asset.id] } : player),
      pendingPayment: { type: "payment", payerId: "p1", recipientId: "p2", assetId: asset.id, resourceId: asset.resourceId, amount: 3 }
    };
    expect(() => payPendingPayment(game, "p1")).toThrowError(/faillite/);
    game = declareBankruptcy(game, "p1");
    expect(game.phase).toBe("AUCTION");
    expect(game.auction?.bankSale).toBe(true);
    expect(game.ownership[asset.id]).toBeUndefined();
    expect(game.players.find((player) => player.id === "p1")?.assetIds).toEqual([]);
    expect(game.players.find((player) => player.id === "p1")?.bankrupt).toBe(true);
    expect(game.players.find((player) => player.id === "p2")?.capital).toBe(69);
    expect(game.recentEvents.find((event) => event.type === "player_bankrupt")?.data).toMatchObject({ amount: 3, creditorCompensation: 3, debtToBank: 0 });
    const capitalBeforeBankAuction = game.players.reduce((total, player) => total + player.capital, 0);
    const bankAuctionPrice = game.auction!.minimumBid;
    game = placeBid(game, "p2", game.auction!.minimumBid);
    game = passAuction(game, "p3");
    expect(game.ownership[asset.id]).toBe("p2");
    expect(game.players.reduce((total, player) => total + player.capital, 0)).toBe(capitalBeforeBankAuction - bankAuctionPrice);
    expect(game.recentEvents.find((event) => event.type === "auction_won")?.data).toMatchObject({ bankDirection: "player_to_bank", amount: bankAuctionPrice });
    expect(game.phase).toBe("WAITING_FOR_ROLL");
    expect(game.activePlayerId).toBe("p2");
  });

  it("increases retombées with sector concentration", () => {
    const asset = ASSETS[0]!;
    const game = startedGame();
    const oneAsset = { ...game, players: game.players.map((player) => player.id === "p2" ? { ...player, assetIds: [ASSETS[0]!.id] } : player) };
    const fourAssets = { ...game, players: game.players.map((player) => player.id === "p2" ? { ...player, assetIds: ASSETS.filter((item) => item.resourceId === asset.resourceId).map((item) => item.id) } : player) };
    expect(getPaymentAmount(fourAssets, asset, "p2")).toBeGreaterThan(getPaymentAmount(oneAsset, asset, "p2"));
  });

  it("resolves the three special spaces", () => {
    const trend = landOnSpace(startedGame(), "observatory-north");
    expect(trend.recentEvents.at(-1)?.type).toBe("trend_drawn");
    expect(trend.lastCard?.kind).toBe("trend");
    const auction = landOnSpace(startedGame(), "exchange-east");
    expect(auction.phase).toBe("WAITING_FOR_END_TURN");
    expect(auction.auction).toBeNull();
    expect(auction.recentEvents.at(-1)?.message).toContain("deux joueurs");
    const restingLever = landOnSpace(startedGame(), "harbor-south");
    expect(restingLever.phase).toBe("WAITING_FOR_END_TURN");
    expect(restingLever.pendingLever).toBeNull();
    expect(restingLever.recentEvents.at(-1)?.message).toContain("deux joueurs");
    const lever = landOnSpace(startedGameWithThree(), "harbor-south");
    expect(lever.phase).toBe("WAITING_FOR_LEVER_PURCHASE");
    expect(lever.pendingLever?.price).toBe(3);
    const purchased = buyPendingLever(lever, "p1");
    expect(purchased.players[0]?.leverIds).toHaveLength(1);
    expect(purchased.players[0]?.capital).toBe(63);
    expect(purchased.recentEvents.at(-1)?.data).toMatchObject({ bankDirection: "player_to_bank", amount: 3 });
  });

  it("pays a dividend from the dice total, then resolves the associated resource royalties", () => {
    const space = BOARD.find((item) => item.type === "special" && item.kind === "dividend")!;
    if (space.type !== "special" || space.kind !== "dividend") throw new Error("Dividend space missing");
    const royaltyTitle = ASSETS.find((asset) => asset.resourceId === space.resourceId && asset.share >= 30)!;
    let game = startedGameWithThree();
    game = { ...game, ownership: { [royaltyTitle.id]: "p2" }, players: game.players.map((player) => player.id === "p2" ? { ...player, assetIds: [royaltyTitle.id] } : player) };
    const capitalBefore = game.players[0]!.capital;
    game = landOnSpace(game, space.id);
    const [red, white] = game.lastRoll!.dice;
    const doubleTax = red === white ? red : 0;
    expect(game.players[0]!.capital).toBe(capitalBefore - doubleTax + game.lastRoll!.total * .5);
    expect(game.pendingPayment).toMatchObject({ recipientId: "p2", resourceId: space.resourceId });
    expect(game.recentEvents.find((event) => event.type === "dividend_received")?.data).toMatchObject({ bankDirection: "bank_to_player", amount: game.lastRoll!.total * .5 });
  });

  it("offers only already-owned resources in the matching regional catalogue", () => {
    const space = BOARD.find((item) => item.type === "special" && item.kind === "regional_choice")!;
    if (space.type !== "special" || space.kind !== "regional_choice") throw new Error("Regional space missing");
    const owned = ASSETS.find((asset) => ASSETS.some((candidate) => candidate.resourceId === asset.resourceId && space.continents.includes(COUNTRIES.find((country) => country.id === candidate.countryId)!.continent)))!;
    let game = startedGameWithThree();
    game = { ...game, ownership: { [owned.id]: "p1" }, players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [owned.id] } : player) };
    game = landOnSpace(game, space.id);
    expect(game.pendingAction?.source).toBe("regional");
    expect(game.pendingAction?.availableAssetIds.length).toBeGreaterThan(0);
    for (const assetId of game.pendingAction!.availableAssetIds) {
      const asset = ASSETS.find((candidate) => candidate.id === assetId)!;
      expect(asset.resourceId).toBe(owned.resourceId);
      expect(space.continents).toContain(COUNTRIES.find((country) => country.id === asset.countryId)!.continent);
    }
  });

  it("unlocks the global catalogue after one completed lap", () => {
    const owned = ASSETS[0]!;
    let game = startedGameWithThree();
    game = { ...game, ownership: { [owned.id]: "p1" }, players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [owned.id] } : player) };
    game = landOnSpace(game, "global-choice-1");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.pendingAction).toBeNull();
    game = { ...startedGameWithThree(), ownership: { [owned.id]: "p1" }, players: startedGameWithThree().players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: [owned.id] } : player) };
    game = landOnSpace(game, "global-choice-1");
    expect(game.pendingAction?.source).toBe("global");
    expect(game.pendingAction?.availableAssetIds.every((id) => ASSETS.find((asset) => asset.id === id)?.resourceId === owned.resourceId)).toBe(true);
  });

  it("skips the next turn after a customs control", () => {
    let game = landOnSpace(startedGameWithThree(), "customs-1");
    expect(game.players.find((player) => player.id === "p1")?.turnsToSkip).toBe(1);
    game = endTurn(game, "p1");
    game = endTurn({ ...game, phase: "WAITING_FOR_END_TURN" }, "p2");
    game = endTurn({ ...game, phase: "WAITING_FOR_END_TURN" }, "p3");
    expect(game.activePlayerId).toBe("p2");
    expect(game.players.find((player) => player.id === "p1")?.turnsToSkip).toBe(0);
    expect(game.recentEvents.some((event) => event.type === "turn_skipped" && event.playerId === "p1")).toBe(true);
  });

  it("forces a post-lap seller to auction possessions selected by the red die", () => {
    let game = startedGameWithThree();
    const owned = ASSETS.slice(0, 3).map((asset) => asset.id);
    game = { ...game, ownership: Object.fromEntries(owned.map((id) => [id, "p1"])), players: game.players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: owned } : player) };
    game = landOnSpace(game, "exchange-east");
    expect(game.phase).toBe("AUCTION");
    expect(game.auction?.mode).toBe("selection");
    expect(game.auction?.sellerId).toBe("p1");
    const selected = owned;
    game = selectAuctionAssets(game, "p1", selected);
    expect(game.auction?.mode).toBe("bidding");
    expect(game.auction?.lots).toHaveLength(1);
    expect(game.auction?.minimumBid).toBe(selected.reduce((total, id) => total + ASSETS.find((asset) => asset.id === id)!.basePrice, 0) / 2);
    const minimum = game.auction!.minimumBid;
    const capitalBeforeSale = game.players.reduce((total, player) => total + player.capital, 0);
    game = placeBid(game, "p2", minimum);
    expect(() => placeBid(game, "p3", minimum + .05)).toThrowError(/minimale/);
    game = passAuction(game, "p3");
    expect(game.ownership[selected[0]!]).toBe("p2");
    expect(game.players.find((player) => player.id === "p1")!.capital).toBe(66 + minimum);
    expect(game.players.reduce((total, player) => total + player.capital, 0)).toBe(capitalBeforeSale);
  });

  it("uses a short auction window and only extends late bids", () => {
    let game = startedGameWithThree();
    const assetId = ASSETS[0]!.id;
    game = { ...game, ownership: { [assetId]: "p1" }, players: game.players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: [assetId] } : player) };
    game = selectAuctionAssets(landOnSpace(game, "auction-west"), "p1", [assetId]);
    const initialDeadline = game.auction!.deadline!;
    expect(initialDeadline - Date.now()).toBeGreaterThan(AUCTION_INITIAL_DURATION_MS - 100);
    game = placeBid(game, "p2", game.auction!.minimumBid);
    expect(game.auction?.deadline).toBe(initialDeadline);

    const lateDeadline = Date.now() + 250;
    game = { ...game, auction: { ...game.auction!, deadline: lateDeadline } };
    game = placeBid(game, "p3", game.auction!.currentBid + .1);
    expect(game.auction!.deadline! - Date.now()).toBeGreaterThan(AUCTION_BID_GRACE_MS - 100);
  });

  it("lets the bank buy an unsold lot at half price after the deadline", () => {
    let game = startedGameWithThree(); const assetId = ASSETS[0]!.id;
    game = { ...game, ownership: { [assetId]: "p1" }, players: game.players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: [assetId] } : player) };
    game = landOnSpace(game, "auction-west");
    game = selectAuctionAssets(game, "p1", [assetId]);
    const minimum = game.auction!.minimumBid;
    game = closeExpiredAuction(game, game.auction!.deadline! + 1);
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.ownership[assetId]).toBeUndefined();
    expect(game.players[0]!.capital).toBe(66 + minimum);
    expect(game.recentEvents.find((event) => event.type === "auction_passed")?.data).toMatchObject({ bankDirection: "bank_to_player", amount: minimum });
  });

  it("exchanges every title held for each selected resource", () => {
    const resourceOne = ASSETS[0]!.resourceId;
    const offeredGroup = ASSETS.filter((asset) => asset.resourceId === resourceOne).slice(0, 2);
    const resourceTwo = ASSETS.find((asset) => asset.resourceId !== resourceOne)!.resourceId;
    const requestedGroup = ASSETS.filter((asset) => asset.resourceId === resourceTwo).slice(0, 2);
    let game = startedGame();
    game = { ...game, ownership: Object.fromEntries([...offeredGroup.map((asset) => [asset.id, "p1"]), ...requestedGroup.map((asset) => [asset.id, "p2"])]), players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: offeredGroup.map((asset) => asset.id) } : { ...player, assetIds: requestedGroup.map((asset) => asset.id) }) };
    game = proposeTrade(game, "p1", { targetId: "p2", offeredResourceId: resourceOne, requestedResourceId: resourceTwo, offeredCredits: 2, requestedCredits: 0 });
    expect(game.phase).toBe("WAITING_FOR_TRADE");
    game = respondToTrade(game, "p2", true);
    expect(offeredGroup.every((asset) => game.ownership[asset.id] === "p2")).toBe(true);
    expect(requestedGroup.every((asset) => game.ownership[asset.id] === "p1")).toBe(true);
    expect(game.players[0]?.capital).toBe(98);
    expect(game.players[1]?.capital).toBe(102);
  });

  it("lets the active player sell a complete resource group with zero credits", () => {
    const resourceId = ASSETS[0]!.resourceId;
    const group = ASSETS.filter((asset) => asset.resourceId === resourceId).slice(0, 3);
    let game = startedGame();
    game = { ...game, ownership: Object.fromEntries(group.map((asset) => [asset.id, "p1"])), players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 0, assetIds: group.map((asset) => asset.id) } : player) };
    game = proposeTrade(game, "p1", { targetId: "p2", offeredResourceId: resourceId, requestedResourceId: null, offeredCredits: 0, requestedCredits: 8 });
    game = respondToTrade(game, "p2", true);
    expect(game.players.find((player) => player.id === "p1")?.capital).toBe(8);
    expect(game.players.find((player) => player.id === "p1")?.assetIds).toEqual([]);
    expect(game.players.find((player) => player.id === "p2")?.capital).toBe(92);
    expect(group.every((asset) => game.ownership[asset.id] === "p2")).toBe(true);
  });

  it("lets a threatened player liquidate a portfolio before declaring bankruptcy", () => {
    const concession = ASSETS[0]!;
    let game = startedGame();
    game = {
      ...game,
      phase: "WAITING_FOR_PAYMENT",
      ownership: { [concession.id]: "p1" },
      players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1, assetIds: [concession.id] } : player),
      pendingPayment: { type: "payment", payerId: "p1", recipientId: "p2", assetId: concession.id, resourceId: concession.resourceId, amount: 3 }
    };
    game = proposeTrade(game, "p1", { targetId: "p2", offeredResourceId: concession.resourceId, requestedResourceId: null, offeredCredits: 0, requestedCredits: 5 });
    expect(game.tradeOffer?.returnPhase).toBe("WAITING_FOR_PAYMENT");
    game = respondToTrade(game, "p2", true);
    expect(game.phase).toBe("WAITING_FOR_PAYMENT");
    expect(game.players.find((player) => player.id === "p1")?.capital).toBe(6);
    expect(game.ownership[concession.id]).toBe("p2");
    game = payPendingPayment(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
  });

  it("allows an inactive player to exchange resource groups but not to initiate a sale", () => {
    const first = ASSETS[0]!;
    const second = ASSETS.find((asset) => asset.resourceId !== first.resourceId)!;
    const started = startedGame();
    const game = { ...started, ownership: { [first.id]: "p1", [second.id]: "p2" }, players: started.players.map((player) => player.id === "p1" ? { ...player, assetIds: [first.id] } : { ...player, assetIds: [second.id] }) };
    expect(proposeTrade(game, "p2", { targetId: "p1", offeredResourceId: second.resourceId, requestedResourceId: first.resourceId, offeredCredits: 0, requestedCredits: 0 }).phase).toBe("WAITING_FOR_TRADE");
    expect(() => proposeTrade(game, "p2", { targetId: "p1", offeredResourceId: second.resourceId, requestedResourceId: null, offeredCredits: 0, requestedCredits: 3 })).toThrowError(/pendant votre tour/);
  });

  it("forms a taxed joint consortium and keeps only the more valuable pawn active", () => {
    const first = ASSETS[0]!;
    const second = ASSETS.find((item) => item.resourceId !== first.resourceId)!;
    let game = startedGameWithThree();
    game = {
      ...game,
      ownership: { [first.id]: "p1", [second.id]: "p2" },
      players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [first.id] } : player.id === "p2" ? { ...player, assetIds: [second.id] } : player)
    };
    const tax = (first.purchasePrice + second.purchasePrice) / 2;
    game = proposeTrade(game, "p1", { targetId: "p2", kind: "alliance", offeredResourceId: null, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0 });
    expect(game.tradeOffer).toMatchObject({ kind: "alliance", allianceTax: tax });
    game = respondToTrade(game, "p2", true);
    const pilot = game.players.find((player) => !player.mergedIntoId && player.allianceId)!;
    const associate = game.players.find((player) => player.mergedIntoId === pilot.id)!;
    expect(pilot.assetIds).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(pilot.capital).toBe(132 - tax * 2);
    expect(associate.assetIds).toEqual([]);
    expect(associate.capital).toBe(0);
    expect(game.ownership[first.id]).toBe(pilot.id);
    expect(game.ownership[second.id]).toBe(pilot.id);
  });

  it("uses a purchased Joker to cancel a forced sale", () => {
    const joker = LEVER_CARDS[0]!; const assetId = ASSETS[0]!.id;
    let game = startedGameWithThree();
    game = { ...game, ownership: { [assetId]: "p1" }, players: game.players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: [assetId], leverIds: [joker.id] } : player) };
    game = landOnSpace(game, "exchange-east");
    expect(game.auction?.mode).toBe("selection");
    game = useLever(game, "p1", joker.id);
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.auction).toBeNull();
    expect(game.players[0]?.leverIds).toEqual([]);
    expect(game.leverDeck.at(-1)).toBe(joker.id);
  });

  it("counts the first completed lap that unlocks auction spaces", () => {
    let game = startedGameWithThree();
    game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, position: BOARD.length - 2 } : player) };
    game = rollDice(game, "p1");
    expect(game.players[0]?.lapsCompleted).toBe(1);
  });

  it("ends immediately when bankruptcy leaves one solvent player", () => {
    let game = startedGame();
    game = { ...game, phase: "WAITING_FOR_PAYMENT", players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1 } : player), pendingPayment: { type: "payment", payerId: "p1", recipientId: "p2", assetId: ASSETS[0]!.id, resourceId: ASSETS[0]!.resourceId, amount: 3 } };
    game = declareBankruptcy(game, "p1");
    expect(game.phase).toBe("FINISHED");
    expect(game.winnerId).toBe("p2");
    expect(game.finishReason).toBe("LAST_SOLVENT");
  });

  it("does not name a winner when the host stops the game", () => {
    let game = startedGame();
    game = { ...game, players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 200 } : player) };

    game = finishGame(game);

    expect(game.finishReason).toBe("ADMIN");
    expect(game.winnerId).toBeNull();
    expect(game.recentEvents.at(-1)).toMatchObject({ type: "game_finished" });
    expect(game.recentEvents.at(-1)?.playerId).toBeUndefined();
  });

  it("allows a complete indivisible group even when a smaller holding is also present", () => {
    const group = ASSETS.filter((asset) => asset.resourceId === ASSETS[0]!.resourceId).slice(0, 4);
    const extra = ASSETS.find((asset) => asset.resourceId !== group[0]!.resourceId)!;
    let game = startedGameWithThree();
    game = {
      ...game,
      phase: "AUCTION",
      ownership: Object.fromEntries([...group, extra].map((asset) => [asset.id, "p1"])),
      players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [...group, extra].map((asset) => asset.id) } : player),
      auction: { mode: "selection", sellerId: "p1", bankSale: false, targetCount: 2, redDie: 2, assetId: group[0]!.id, selectedAssetIds: [], lots: [], currentLotIndex: 0, minimumBid: 0, currentBid: 0, leaderId: null, eligiblePlayerIds: ["p2", "p3"], passedPlayerIds: [], deadline: null }
    };

    game = selectAuctionAssets(game, "p1", group.map((asset) => asset.id));

    expect(game.auction?.mode).toBe("bidding");
    expect(game.auction?.selectedAssetIds).toEqual(group.map((asset) => asset.id));
  });

  it("refuses a trade proposal to an offline player", () => {
    let game = startedGame();
    game = { ...game, players: game.players.map((player) => player.id === "p2" ? { ...player, connected: false } : player) };

    expect(() => proposeTrade(game, "p1", { targetId: "p2", kind: "alliance", offeredResourceId: null, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0 })).toThrowError(/reconnecter/);
  });

  it("does not require an inactive consortium associate to reconnect before resuming", () => {
    let game = startedGame();
    game = {
      ...game,
      phase: "PAUSED",
      previousPhase: "WAITING_FOR_ROLL",
      players: game.players.map((player) => player.id === "p2" ? { ...player, connected: false, allianceId: "consortium-p1", mergedIntoId: "p1" } : { ...player, allianceId: "consortium-p1" })
    };

    game = resumeGame(game);

    expect(game.phase).toBe("WAITING_FOR_ROLL");
  });

  it("pauses when bankruptcy would pass the turn to an offline player", () => {
    let game = startedGameWithThree();
    game = {
      ...game,
      phase: "WAITING_FOR_PAYMENT",
      players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1 } : player.id === "p2" ? { ...player, connected: false } : player),
      pendingPayment: { type: "payment", payerId: "p1", recipientId: "p3", assetId: ASSETS[0]!.id, resourceId: ASSETS[0]!.resourceId, amount: 3 }
    };

    game = declareBankruptcy(game, "p1");

    expect(game.phase).toBe("PAUSED");
    expect(game.previousPhase).toBe("WAITING_FOR_ROLL");
    expect(game.pauseReason).toBe("PLAYER_DISCONNECTED");
    expect(game.pausePlayerId).toBe("p2");
  });
  it("continues after twelve rounds without ending automatically", () => {
    let game: GameState = { ...startedGame(), roundNumber: 12, phase: "WAITING_FOR_END_TURN", players: startedGame().players.map((player) => player.id === "p1" ? { ...player, capital: 140 } : player) };
    game = endTurn(game, "p1");
    game = endTurn({ ...game, phase: "WAITING_FOR_END_TURN" }, "p2");
    expect(game.phase).toBe("WAITING_FOR_ROLL");
    expect(game.roundNumber).toBe(13);
    expect(game.winnerId).toBeNull();
    expect(game.finishReason).toBeNull();
  });

  it("prepares a clean rematch while keeping player identities", () => {
    const titleId = ASSETS[0]!.id;
    const running = startedGame();
    const finished = finishGame({
      ...running,
      ownership: { [titleId]: "p1" },
      players: running.players.map((player) => player.id === "p1" ? { ...player, capital: 7, assetIds: [titleId], leverIds: ["payment-shield"], position: 34 } : player)
    });
    const restarted = restartGame(finished);

    expect(restarted.phase).toBe("LOBBY");
    expect(restarted.status).toBe("LOBBY");
    expect(restarted.players.map(({ id, name, color, symbol }) => ({ id, name, color, symbol }))).toEqual(running.players.map(({ id, name, color, symbol }) => ({ id, name, color, symbol })));
    expect(restarted.players.every((player) => !player.ready && !player.bankrupt && player.position === 0 && player.capital === 30 && !player.assetIds.length && !player.leverIds.length)).toBe(true);
    expect(restarted.ownership).toEqual({});
    expect(restarted.roundNumber).toBe(1);
    expect(restarted.winnerId).toBeNull();
    expect(restarted.recentEvents.at(-1)?.type).toBe("game_restarted");
  });

  it("records why a disconnected player paused the game", () => {
    const game = pauseGame(startedGame(), "PLAYER_DISCONNECTED", "p1");
    expect(game.pauseReason).toBe("PLAYER_DISCONNECTED");
    expect(game.pausePlayerId).toBe("p1");
    expect(game.recentEvents.at(-1)?.message).toContain("Aline");
  });

  it("does not apply the obsolete market-index shift after a full round", () => {
    let game: GameState = { ...startedGame(), phase: "WAITING_FOR_END_TURN" };
    game = endTurn(game, "p1");
    game = endTurn({ ...game, phase: "WAITING_FOR_END_TURN" }, "p2");
    expect(game.roundNumber).toBe(2);
    expect(game.recentEvents.some((event) => event.type === "trend_drawn")).toBe(false);
  });

  it("keeps title prices fixed", () => {
    const game = startedGame();
    expect(getCurrentPrice(game, ASSETS[0]!)).toBe(ASSETS[0]!.basePrice);
  });

  it("ends immediately when the final two players form one consortium", () => {
    let game = startedGame();
    game = proposeTrade(game, "p1", { targetId: "p2", kind: "alliance", offeredResourceId: null, requestedResourceId: null, offeredCredits: 0, requestedCredits: 0 });
    game = respondToTrade(game, "p2", true);
    expect(game.phase).toBe("FINISHED");
    expect(game.finishReason).toBe("LAST_SOLVENT");
    expect(game.winnerId).toBe("p1");
    expect(game.recentEvents.slice(-2).map((event) => event.type)).toEqual(["trade_accepted", "game_finished"]);
  });

  it("keeps every selected resource portfolio indivisible at auction", () => {
    const group = ASSETS.filter((asset) => asset.resourceId === ASSETS[0]!.resourceId).slice(0, 2);
    const extra = ASSETS.find((asset) => asset.resourceId !== group[0]!.resourceId)!;
    let game = startedGameWithThree();
    game = { ...game, phase: "AUCTION", ownership: Object.fromEntries([...group, extra].map((asset) => [asset.id, "p1"])), players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [...group, extra].map((asset) => asset.id) } : player), auction: { mode: "selection", sellerId: "p1", bankSale: false, targetCount: 2, redDie: 2, assetId: group[0]!.id, selectedAssetIds: [], lots: [], currentLotIndex: 0, minimumBid: 0, currentBid: 0, leaderId: null, eligiblePlayerIds: ["p2", "p3"], passedPlayerIds: [], deadline: null } };
    expect(() => selectAuctionAssets(game, "p1", [group[0]!.id, extra.id])).toThrowError(/doivent être vendues ensemble/);
    game = selectAuctionAssets(game, "p1", group.map((asset) => asset.id));
    expect(game.auction?.lots).toEqual([group.map((asset) => asset.id)]);
  });

  it("rejects superfluous resource groups in an auction selection", () => {
    const largeGroup = ASSETS.filter((asset) => asset.resourceId === ASSETS[0]!.resourceId).slice(0, 4);
    const extra = ASSETS.find((asset) => asset.resourceId !== largeGroup[0]!.resourceId)!;
    let game = startedGameWithThree();
    game = { ...game, phase: "AUCTION", ownership: Object.fromEntries([...largeGroup, extra].map((asset) => [asset.id, "p1"])), players: game.players.map((player) => player.id === "p1" ? { ...player, assetIds: [...largeGroup, extra].map((asset) => asset.id) } : player), auction: { mode: "selection", sellerId: "p1", bankSale: false, targetCount: 2, redDie: 2, assetId: largeGroup[0]!.id, selectedAssetIds: [], lots: [], currentLotIndex: 0, minimumBid: 0, currentBid: 0, leaderId: null, eligiblePlayerIds: ["p2", "p3"], passedPlayerIds: [], deadline: null } };
    expect(() => selectAuctionAssets(game, "p1", [...largeGroup, extra].map((asset) => asset.id))).toThrowError(/superflu/);
    expect(selectAuctionAssets(game, "p1", largeGroup.map((asset) => asset.id)).auction?.selectedAssetIds).toEqual(largeGroup.map((asset) => asset.id));
  });

  it("supports passing, insufficient funds and an exhausted Technology deck", () => {
    let offered = landOnSpace(startedGameWithThree(), "harbor-south");
    const deckBefore = [...offered.leverDeck];
    offered = passPendingLever(offered, "p1");
    expect(offered.phase).toBe("WAITING_FOR_END_TURN");
    expect(offered.leverDeck).toEqual(deckBefore);
    const pending = { ...offered, phase: "WAITING_FOR_LEVER_PURCHASE" as const, pendingLever: { playerId: "p1", leverId: LEVER_CARDS[0]!.id, price: 3 }, players: offered.players.map((player) => player.id === "p1" ? { ...player, capital: 2 } : player) };
    expect(() => buyPendingLever(pending, "p1")).toThrowError(/insuffisants/);
    const emptyDeck = landOnSpace({ ...startedGameWithThree(), leverDeck: [] }, "harbor-south");
    expect(emptyDeck.phase).toBe("WAITING_FOR_END_TURN");
    expect(emptyDeck.pendingLever).toBeNull();
    expect(emptyDeck.recentEvents.at(-1)?.message).toContain("aucune Technologie");
  });

  it("recycles the fourteen cosmic events only after exhausting the deck", () => {
    const initial = startedGameWithThree();
    let game = { ...initial, players: initial.players.map((player) => player.id === "p1" ? { ...player, capital: 1_000 } : player) };
    const drawn: string[] = [];
    for (let index = 0; index < TREND_CARDS.length + 1; index += 1) {
      game = landOnSpace({ ...game, phase: "WAITING_FOR_ROLL", activePlayerId: "p1" }, "observatory-north");
      drawn.push(game.lastCard!.id);
    }
    expect(new Set(drawn.slice(0, TREND_CARDS.length)).size).toBe(TREND_CARDS.length);
    expect(game.trendDeck).toHaveLength(TREND_CARDS.length - 1);
  });

  it("lets a portal pass cleanly and enforces the six-concession cap", () => {
    const firstResource = ASSETS[0]!.resourceId;
    const secondResource = ASSETS.find((asset) => asset.resourceId !== firstResource)!.resourceId;
    const owned = [ASSETS.find((asset) => asset.resourceId === firstResource)!, ASSETS.find((asset) => asset.resourceId === secondResource)!];
    let game = startedGameWithThree();
    game = { ...game, ownership: Object.fromEntries(owned.map((asset) => [asset.id, "p1"])), players: game.players.map((player) => player.id === "p1" ? { ...player, lapsCompleted: 1, assetIds: owned.map((asset) => asset.id) } : player) };
    game = landOnSpace(game, "global-choice-1");
    expect(game.pendingAction?.availableAssetIds.length).toBeGreaterThan(6);
    expect(() => buyPendingAsset(game, "p1", game.pendingAction!.availableAssetIds.slice(0, 7))).toThrowError(/invalide/);
    game = passPendingAsset(game, "p1");
    expect(game.phase).toBe("WAITING_FOR_END_TURN");
    expect(game.pendingAction).toBeNull();
  });

  it("pays every queued creditor in full when the bank assumes a bankruptcy", () => {
    let game = startedGameWithThree();
    game = { ...game, phase: "WAITING_FOR_PAYMENT", players: game.players.map((player) => player.id === "p1" ? { ...player, capital: 1 } : player), pendingPayment: { type: "payment", payerId: "p1", recipientId: "p2", assetId: ASSETS[0]!.id, resourceId: ASSETS[0]!.resourceId, amount: 3 }, paymentQueue: [{ type: "payment", payerId: "p1", recipientId: "p3", assetId: ASSETS[0]!.id, resourceId: ASSETS[0]!.resourceId, amount: 4 }] };
    const p2Before = game.players.find((player) => player.id === "p2")!.capital;
    const p3Before = game.players.find((player) => player.id === "p3")!.capital;
    game = declareBankruptcy(game, "p1");
    expect(game.players.find((player) => player.id === "p2")!.capital).toBe(p2Before + 3);
    expect(game.players.find((player) => player.id === "p3")!.capital).toBe(p3Before + 4);
    expect(game.recentEvents.find((event) => event.type === "player_bankrupt")?.data).toMatchObject({ amount: 7, creditorCompensation: 7, debtToBank: 0 });
  });});
