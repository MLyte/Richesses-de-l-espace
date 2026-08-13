import { describe, expect, it } from "vitest";
import { pickSpacefarerName, resolvePlayerName, SPACEFARER_NAMES } from "./player-name-placeholder";

describe("player name placeholder", () => {
  it("offers five well-known spacefarer full names", () => {
    expect(SPACEFARER_NAMES).toEqual(["Yuri Gagarine", "Neil Armstrong", "Valentina Terechkova", "Buzz Aldrin", "Thomas Pesquet"]);
  });

  it.each([
    [0, "Yuri Gagarine"],
    [0.2, "Neil Armstrong"],
    [0.4, "Valentina Terechkova"],
    [0.6, "Buzz Aldrin"],
    [0.999_999, "Thomas Pesquet"]
  ])("selects the expected name for a random value of %s", (randomValue, expected) => {
    expect(pickSpacefarerName(() => randomValue)).toBe(expected);
  });

  it("uses the suggested name when the player leaves the field blank", () => {
    expect(resolvePlayerName("   ", "Thomas Pesquet")).toBe("Thomas Pesquet");
  });

  it("keeps and trims a custom nickname", () => {
    expect(resolvePlayerName("  Nova  ", "Thomas Pesquet")).toBe("Nova");
  });
});
