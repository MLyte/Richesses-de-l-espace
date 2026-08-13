import { describe, expect, it } from "vitest";
import { getBotThinkingDelay, type BotDecision } from "./bot-strategy";

const roll: BotDecision = { type: "ROLL", reason: "TEST" };
const purchase: BotDecision = { type: "BUY_ASSETS", assetIds: [], reason: "TEST" };

describe("bot thinking delay", () => {
  it("samples a bounded delay for the kind of decision", () => {
    expect(getBotThinkingDelay(roll, "BALANCED", { random: () => 0 })).toBe(700);
    expect(getBotThinkingDelay(roll, "BALANCED", { random: () => 1 })).toBe(1_400);
    expect(getBotThinkingDelay(purchase, "BALANCED", { random: () => .5 })).toBe(1_650);
  });

  it("gives cautious robots more time and ambitious robots less", () => {
    const cautious = getBotThinkingDelay(purchase, "CAUTIOUS", { random: () => .5 });
    const balanced = getBotThinkingDelay(purchase, "BALANCED", { random: () => .5 });
    const ambitious = getBotThinkingDelay(purchase, "AMBITIOUS", { random: () => .5 });
    expect(cautious).toBeGreaterThan(balanced);
    expect(ambitious).toBeLessThan(balanced);
  });

  it("does not stack thinking time on a longer mechanical animation", () => {
    expect(getBotThinkingDelay(purchase, "CAUTIOUS", { minimumDelayMs: 4_500, random: () => 1 })).toBe(4_500);
  });

  it("clamps custom random sources to the expected range", () => {
    expect(getBotThinkingDelay(roll, "BALANCED", { random: () => -2 })).toBe(700);
    expect(getBotThinkingDelay(roll, "BALANCED", { random: () => 4 })).toBe(1_400);
  });
});
