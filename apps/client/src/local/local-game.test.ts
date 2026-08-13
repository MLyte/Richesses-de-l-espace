import { beforeEach, describe, expect, it, vi } from "vitest";
import { STARTING_RACE_SHIPS } from "@richesses-espace/game";
import { PLAYER_COLORS, PLAYER_SYMBOLS } from "@richesses-espace/protocol";
import { LOCAL_BOT_COUNT_MAX, LOCAL_BOT_ID, LOCAL_BOT_NAMES, LOCAL_HUMAN_ID, finishLocalRace, getLocalBotTurn, loadLocalGame, resumeLocalGame, runLocalBotTurn, runLocalGameCommand, startLocalGame } from "./local-game";

const playerSetup = { name: "Mathieu", color: "#3784a6", symbol: "cat" };

function finishHumanTurn(): void {
  runLocalGameCommand("turn:roll");
  if (loadLocalGame().game.phase === "WAITING_FOR_PURCHASE") runLocalGameCommand("purchase:pass");
  if (loadLocalGame().game.phase === "WAITING_FOR_PAYMENT") runLocalGameCommand("payment:pay");
  if (loadLocalGame().game.phase === "WAITING_FOR_END_TURN") runLocalGameCommand("turn:end");
}

function finishStartingRace(): void {
  for (let step = 0; step < 10 && loadLocalGame().game.phase === "SHIP_SELECTION"; step += 1) {
    const botTurn = getLocalBotTurn();
    if (botTurn) runLocalBotTurn(botTurn.expectedRevision, botTurn.playerId);
    else {
      const taken = new Set(Object.values(loadLocalGame().game.startingRace.selections));
      runLocalGameCommand("race:select-ship", { shipId: STARTING_RACE_SHIPS.find((shipId) => !taken.has(shipId))! });
    }
  }
  const race = loadLocalGame();
  if (race.game.phase === "SHIP_RACE") finishLocalRace(race.game.revision);
}

function advanceToHumanTurn(): void {
  finishStartingRace();
  for (let step = 0; step < 80 && loadLocalGame().game.activePlayerId !== LOCAL_HUMAN_ID; step += 1) {
    const botTurn = getLocalBotTurn();
    if (!botTurn) throw new Error(`Robot bloqué pendant ${loadLocalGame().game.phase}`);
    runLocalBotTurn(botTurn.expectedRevision, botTurn.playerId);
  }
}

describe("local player versus computer game", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("window", {
      localStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
      location: { origin: "https://example.test" }
    });
    startLocalGame(playerSetup);
  });

  it("starts the chosen human identity against a randomly identified balanced robot", () => {
    const initial = loadLocalGame();
    const bot = initial.game.players.find((player) => player.id === LOCAL_BOT_ID)!;
    expect(initial.game.phase).toBe("SHIP_SELECTION");
    expect(initial.player?.allowedActions).toContain("SELECT_STARTING_SHIP");
    expect(initial.game.players[0]).toMatchObject({ id: LOCAL_HUMAN_ID, name: "Mathieu", color: "#3784a6", symbol: "cat", isBot: false });
    expect(bot).toMatchObject({ isBot: true, botProfile: "BALANCED", connected: true, ready: true });
    expect(LOCAL_BOT_NAMES).toContain(bot.name);
    expect(PLAYER_COLORS).toContain(bot.color);
    expect(PLAYER_SYMBOLS.map((symbol) => symbol.id)).toContain(bot.symbol);
    expect(bot.name).not.toBe(playerSetup.name);
    expect(bot.color).not.toBe(playerSetup.color);
    expect(bot.symbol).not.toBe(playerSetup.symbol);
  });

  it("offers exactly 20 French constellation names and avoids the human name", () => {
    expect(LOCAL_BOT_NAMES).toHaveLength(20);
    expect(new Set(LOCAL_BOT_NAMES).size).toBe(20);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const initial = startLocalGame({ ...playerSetup, name: LOCAL_BOT_NAMES[0] });
    expect(initial.game.players.find((player) => player.id === LOCAL_BOT_ID)?.name).not.toBe(LOCAL_BOT_NAMES[0]);
  });

  it("creates one to five robots with unique random identities and neutral ids", () => {
    const initial = startLocalGame(playerSetup, "MOBILE_ONLY", true, LOCAL_BOT_COUNT_MAX);
    const bots = initial.game.players.filter((player) => player.isBot);
    expect(initial.game.players).toHaveLength(6);
    expect(bots.map((bot) => bot.id)).toEqual(["bot-1", "bot-2", "bot-3", "bot-4", "bot-5"]);
    expect(bots.every((bot) => bot.id !== "orion" && bot.botProfile === "BALANCED")).toBe(true);
    expect(new Set(bots.map((bot) => bot.name)).size).toBe(5);
    expect(new Set(bots.map((bot) => bot.color)).size).toBe(5);
    expect(new Set(bots.map((bot) => bot.symbol)).size).toBe(5);
    expect(bots.some((bot) => bot.name === playerSetup.name || bot.color === playerSetup.color || bot.symbol === playerSetup.symbol)).toBe(false);
  });

  it("assigns, exposes and preserves an individual profile for every robot", () => {
    const profiles = ["CAUTIOUS", "BALANCED", "AMBITIOUS"] as const;
    const initial = startLocalGame(playerSetup, "MOBILE_ONLY", true, profiles);
    expect(initial.game.players.filter((player) => player.isBot).map((player) => player.botProfile)).toEqual(profiles);

    const stored = JSON.parse(String(vi.mocked(window.localStorage.setItem).mock.calls.at(-1)?.[1]));
    expect(stored).toMatchObject({
      version: 4,
      botProfiles: { "bot-1": "CAUTIOUS", "bot-2": "BALANCED", "bot-3": "AMBITIOUS" }
    });

    runLocalGameCommand("admin:end");
    const restarted = runLocalGameCommand("admin:restart").snapshot;
    expect(restarted.game.players.filter((player) => player.isBot).map((player) => player.botProfile)).toEqual(profiles);
  });

  it("requires a valid chosen identity", () => {
    expect(() => startLocalGame({ ...playerSetup, name: "  " })).toThrow("pseudo de 1 à 20 caractères");
    expect(() => startLocalGame(playerSetup, "MOBILE_ONLY", true, 0)).toThrow("entre 1 et 5 robots");
    expect(() => startLocalGame(playerSetup, "MOBILE_ONLY", true, 6)).toThrow("entre 1 et 5 robots");
    expect(() => startLocalGame(playerSetup, "MOBILE_ONLY", true, 1.5)).toThrow("entre 1 et 5 robots");
    expect(() => startLocalGame(playerSetup, "MOBILE_ONLY", true, ["UNKNOWN" as never])).toThrow("niveau valide");
  });

  it("invalidates the previous forced-identity storage format", () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(JSON.stringify({ version: 1, state: {} }));
    expect(resumeLocalGame("MOBILE_ONLY", true, true)).toBeNull();
  });

  it("uses the real engine for the human turn", () => {
    advanceToHumanTurn();
    const result = runLocalGameCommand("turn:roll");
    expect(result.snapshot.game.lastRoll?.total).toBeGreaterThanOrEqual(2);
    expect(result.snapshot.events.map((event) => event.type)).toEqual(expect.arrayContaining(["dice_rolled", "pawn_moved"]));
  });

  it("lets the robot take over automatically", () => {
    advanceToHumanTurn();
    finishHumanTurn();
    const turn = getLocalBotTurn();
    expect(turn).toMatchObject({ playerId: LOCAL_BOT_ID, decision: { type: "ROLL" } });
    expect(runLocalBotTurn(turn!.expectedRevision, turn!.playerId)?.events.map((event) => event.type)).toContain("dice_rolled");
  });

  it("lets several robots take their turns successively", () => {
    startLocalGame(playerSetup, "MOBILE_ONLY", true, 3);
    advanceToHumanTurn();
    finishHumanTurn();
    const robotIds = new Set<string>();
    for (let step = 0; step < 80 && loadLocalGame().game.activePlayerId !== LOCAL_HUMAN_ID; step += 1) {
      const turn = getLocalBotTurn();
      expect(turn).not.toBeNull();
      robotIds.add(turn!.playerId);
      expect(runLocalBotTurn(turn!.expectedRevision, turn!.playerId)).not.toBeNull();
    }
    expect(robotIds).toEqual(new Set(["bot-1", "bot-2", "bot-3"]));
    expect(loadLocalGame().game.activePlayerId).toBe(LOCAL_HUMAN_ID);
  });

  it("rejects an obsolete delayed bot decision", () => {
    advanceToHumanTurn();
    finishHumanTurn();
    const turn = getLocalBotTurn()!;
    expect(runLocalBotTurn(turn.expectedRevision - 1)).toBeNull();
  });

  it("starts a fresh duel immediately after a finished game", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    startLocalGame(playerSetup);
    const previousBot = loadLocalGame().game.players.find((player) => player.id === LOCAL_BOT_ID)!;
    runLocalGameCommand("admin:end");
    vi.mocked(Math.random).mockReturnValueOnce(.99).mockReturnValueOnce(.99).mockReturnValueOnce(.99);
    const restarted = runLocalGameCommand("admin:restart").snapshot;
    const nextBot = restarted.game.players.find((player) => player.id === LOCAL_BOT_ID)!;
    expect(restarted.game.phase).toBe("SHIP_SELECTION");
    expect(restarted.game.players.every((player) => player.ready && player.capital === 100)).toBe(true);
    expect(nextBot.name).not.toBe(previousBot.name);
    expect(nextBot.id).toBe("bot-1");
  });

  it("runs a prolonged deterministic duel without a blocked phase", () => {
    for (let step = 0; step < 240; step += 1) {
      const current = loadLocalGame();
      if (current.game.phase === "FINISHED") break;
      const botTurn = getLocalBotTurn();
      if (botTurn) {
        expect(runLocalBotTurn(botTurn.expectedRevision)).not.toBeNull();
        continue;
      }
      const actions = current.player?.allowedActions ?? [];
      if (actions.includes("SELECT_STARTING_SHIP")) {
        const taken = new Set(Object.values(current.game.startingRace.selections));
        runLocalGameCommand("race:select-ship", { shipId: STARTING_RACE_SHIPS.find((shipId) => !taken.has(shipId))! });
      }
      else if (current.game.phase === "SHIP_RACE") finishLocalRace(current.game.revision);
      else if (actions.includes("ROLL_DICE")) runLocalGameCommand("turn:roll");
      else if (actions.includes("PASS_ASSET")) runLocalGameCommand("purchase:pass");
      else if (actions.includes("PASS_LEVER")) runLocalGameCommand("lever:pass");
      else if (actions.includes("PAY_RETURNS")) runLocalGameCommand("payment:pay");
      else if (actions.includes("DECLARE_BANKRUPTCY")) runLocalGameCommand("finance:bankruptcy");
      else if (actions.includes("END_TURN")) runLocalGameCommand("turn:end");
      else throw new Error(`Phase locale bloquée : ${current.game.phase}`);
    }
    const final = loadLocalGame().game;
    expect(final.phase === "FINISHED" || final.turnNumber >= 20).toBe(true);
  });
});
