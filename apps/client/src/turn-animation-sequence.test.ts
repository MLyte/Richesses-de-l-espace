import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const store = read("./stores/game.ts");
const playerView = read("./views/PlayerView.vue");
const styles = read("./styles.css");

describe("turn animation sequence", () => {
  it("clears the dice overlay before moving the pawn step by step", () => {
    const movement = store.slice(
      store.indexOf('if (event.type === "pawn_moved"'),
      store.indexOf('if (event.type === "turn_started"')
    );

    expect(movement.indexOf("this.diceAnimation = null")).toBeGreaterThanOrEqual(0);
    expect(movement.indexOf("this.diceAnimation = null")).toBeLessThan(movement.indexOf("for (let step = 1; step <= steps; step += 1)"));
  });

  it("keeps the active player's route visible until its visual pawn reaches the server position", () => {
    const travelGuard = 'v-else-if="turnTravelVisible"';
    const purchaseAction = 'v-else-if="pendingAsset && allowed(\'BUY_ASSET\')"';

    expect(store).toContain("visualPlayerPositions");
    expect(playerView).toContain("visualPosition !== activePlayer.position");
    expect(playerView.indexOf(travelGuard)).toBeLessThan(playerView.indexOf(purchaseAction));
  });

  it("keeps every player's action and movement sounds audible on every client", () => {
    const movement = store.slice(
      store.indexOf('if (event.type === "pawn_moved"'),
      store.indexOf('if (event.type === "turn_started"')
    );

    expect(store).toContain('playEventSound(event.type);');
    expect(movement).toContain('playMoveStep(step, steps);');
    expect(movement).not.toContain('event.playerId === this.player?.playerId');
    expect(store).not.toContain('const moneyEvent = event.type === "payment_due"');
  });

  it("announces the personal turn when rolling the dice actually becomes available", () => {
    expect(store).toContain('this.player?.allowedActions.includes("ROLL_DICE")');
    expect(store).toContain('announcedRollCueKey');
    expect(store).not.toContain('announcedTurnKey');
  });

  it("uses a blue-black backdrop behind the phone dice sequence", () => {
    expect(styles).toMatch(/\.dice-animation-phone::before[^}]*rgba\(2,9,17,\.94\)/s);
    expect(styles).not.toMatch(/\.dice-animation-phone::before[^}]*rgba\(248,241,223/s);
  });
});
