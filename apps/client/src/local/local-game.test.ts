import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_BOT_ID, LOCAL_HUMAN_ID, getLocalBotTurn, loadLocalGame, resetLocalGame, runLocalBotTurn, runLocalGameCommand } from "./local-game";

function finishHumanTurn(): void {
  runLocalGameCommand("turn:roll");
  if (loadLocalGame().game.phase === "WAITING_FOR_PURCHASE") runLocalGameCommand("purchase:pass");
  if (loadLocalGame().game.phase === "WAITING_FOR_PAYMENT") runLocalGameCommand("payment:pay");
  if (loadLocalGame().game.phase === "WAITING_FOR_END_TURN") runLocalGameCommand("turn:end");
}

describe("local player versus computer game", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
      location: { origin: "https://example.test" }
    });
    resetLocalGame();
  });

  it("starts Lyra against balanced Orion", () => {
    const initial = loadLocalGame();
    expect(initial.game.phase).toBe("WAITING_FOR_ROLL");
    expect(initial.game.activePlayerId).toBe(LOCAL_HUMAN_ID);
    expect(initial.player?.allowedActions).toContain("ROLL_DICE");
    expect(initial.game.players.find((player) => player.id === LOCAL_BOT_ID)).toMatchObject({ isBot: true, botProfile: "BALANCED", connected: true, ready: true });
  });

  it("uses the real engine for the human turn", () => {
    const result = runLocalGameCommand("turn:roll");
    expect(result.snapshot.game.lastRoll?.total).toBeGreaterThanOrEqual(2);
    expect(result.snapshot.events.map((event) => event.type)).toEqual(expect.arrayContaining(["dice_rolled", "pawn_moved"]));
  });

  it("lets Orion take over automatically", () => {
    finishHumanTurn();
    const turn = getLocalBotTurn();
    expect(turn).toMatchObject({ playerId: LOCAL_BOT_ID, decision: { type: "ROLL" } });
    expect(runLocalBotTurn(turn!.expectedRevision)?.events.map((event) => event.type)).toContain("dice_rolled");
  });

  it("rejects an obsolete delayed bot decision", () => {
    finishHumanTurn();
    const turn = getLocalBotTurn()!;
    expect(runLocalBotTurn(turn.expectedRevision - 1)).toBeNull();
  });

  it("starts a fresh duel immediately after a finished game", () => {
    runLocalGameCommand("admin:end");
    const restarted = runLocalGameCommand("admin:restart").snapshot;
    expect(restarted.game.phase).toBe("WAITING_FOR_ROLL");
    expect(restarted.game.players.every((player) => player.ready && player.capital === 100)).toBe(true);
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
      if (actions.includes("ROLL_DICE")) runLocalGameCommand("turn:roll");
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
