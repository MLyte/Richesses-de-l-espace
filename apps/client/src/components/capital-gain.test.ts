import { describe, expect, it } from "vitest";
import { resolveCapitalGain } from "./capital-gain";

describe("capital gain detection", () => {
  it("reports every positive balance change, including decimal credits", () => {
    expect(resolveCapitalGain(18, 22)).toBe(4);
    expect(resolveCapitalGain(69.9, 70)).toBe(.1);
  });

  it("ignores initialization, spending, and unchanged balances", () => {
    expect(resolveCapitalGain(null, 100)).toBeNull();
    expect(resolveCapitalGain(22, 20)).toBeNull();
    expect(resolveCapitalGain(22, 22)).toBeNull();
  });
});
