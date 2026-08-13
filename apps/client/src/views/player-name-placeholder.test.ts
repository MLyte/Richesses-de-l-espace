import { describe, expect, it } from "vitest";
import { pickSpacefarerFirstName, SPACEFARER_FIRST_NAMES } from "./player-name-placeholder";

describe("player name placeholder", () => {
  it("offers five well-known spacefarer first names", () => {
    expect(SPACEFARER_FIRST_NAMES).toEqual(["Yuri", "Neil", "Valentina", "Buzz", "Thomas"]);
  });

  it.each([
    [0, "Yuri"],
    [0.2, "Neil"],
    [0.4, "Valentina"],
    [0.6, "Buzz"],
    [0.999_999, "Thomas"]
  ])("selects the expected name for a random value of %s", (randomValue, expected) => {
    expect(pickSpacefarerFirstName(() => randomValue)).toBe(expected);
  });
});
