import { describe, expect, it } from "vitest";
import { splitPlayerWings } from "./display-layout";

describe("TV player wings", () => {
  it.each([
    [2, [1, 1]],
    [3, [2, 1]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]]
  ])("balances %i players across the lateral areas", (count, expected) => {
    const players = Array.from({ length: count }, (_, index) => index);
    expect(splitPlayerWings(players).map((wing) => wing.length)).toEqual(expected);
  });
});
