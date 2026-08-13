import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(new URL("./views/PlayerView.vue", import.meta.url), "utf8");
const displayView = readFileSync(new URL("./views/DisplayView.vue", import.meta.url), "utf8");
const burst = readFileSync(new URL("./components/CapitalGainBurst.vue", import.meta.url), "utf8");

describe("capital gain animation", () => {
  it("reacts to balance increases on both the phone and the shared display", () => {
    expect(playerView).toContain("resolveCapitalGain(previousCapital, capital)");
    expect(playerView).toContain('<CapitalGainBurst v-if="capitalGain"');
    expect(displayView).toContain("resolveCapitalGain(knownPlayerCapital.get(id), capital)");
    expect(displayView).toContain('variant="tv"');
  });

  it("stays decorative and provides a reduced-motion fallback", () => {
    expect(burst).toContain('aria-hidden="true"');
    expect(burst).toContain("@media (prefers-reduced-motion: reduce)");
    expect(burst).toContain("<Coins");
  });
});
