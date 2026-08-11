import { describe, expect, it } from "vitest";
import { resetStaticDemo, runStaticDemoCommand, selectStaticDemoPlayer } from "./static-game";

describe("static UX demo", () => {
  it("rolls a real turn locally and exposes the resulting events", () => {
    const initial = resetStaticDemo("turn");
    expect(initial.player?.allowedActions).toContain("ROLL_DICE");

    const result = runStaticDemoCommand("turn:roll");
    expect(result.snapshot.game.lastRoll?.total).toBeGreaterThanOrEqual(2);
    expect(result.snapshot.events.map((event) => event.type)).toContain("dice_rolled");
    expect(result.snapshot.events.map((event) => event.type)).toContain("pawn_moved");
  });

  it("lets Lyra complete the prepared purchase scenario", () => {
    const initial = resetStaticDemo("purchase");
    const assetId = initial.game.pendingPurchase?.availableAssetIds[0];
    expect(assetId).toBeTruthy();
    expect(initial.player?.allowedActions).toContain("BUY_ASSET");

    const result = runStaticDemoCommand("purchase:buy", { assetIds: [assetId] });
    expect(result.snapshot.game.ownership[assetId!]).toBe("lyra");
    expect(result.snapshot.game.players.find((player) => player.id === "lyra")?.assetIds).toContain(assetId);
  });

  it("supports both sides of a prepared exchange", () => {
    resetStaticDemo("trade");
    expect(selectStaticDemoPlayer("orion").player?.allowedActions).toContain("REJECT_TRADE");
    expect(selectStaticDemoPlayer("lyra").player?.allowedActions).toContain("ACCEPT_TRADE");

    const result = runStaticDemoCommand("trade:accept");
    expect(result.snapshot.game.tradeOffer).toBeNull();
    expect(result.snapshot.events.map((event) => event.type)).toContain("trade_accepted");
  });

  it("resets a scenario to its original data", () => {
    const initial = resetStaticDemo("payment");
    const capital = initial.game.players.find((player) => player.id === "lyra")!.capital;
    runStaticDemoCommand("payment:pay");

    const reset = resetStaticDemo("payment");
    expect(reset.game.players.find((player) => player.id === "lyra")?.capital).toBe(capital);
    expect(reset.game.phase).toBe("WAITING_FOR_PAYMENT");
  });
});
