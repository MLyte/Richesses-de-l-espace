import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const store = read("./stores/game.ts");
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

  it("uses a blue-black backdrop behind the phone dice sequence", () => {
    expect(styles).toMatch(/\.dice-animation-phone::before[^}]*rgba\(2,9,17,\.94\)/s);
    expect(styles).not.toMatch(/\.dice-animation-phone::before[^}]*rgba\(248,241,223/s);
  });
});
