import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const component = readFileSync(fileURLToPath(new URL("./WorldBoard.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("world board pawn rendering", () => {
  it("centres the Lucide token in the board SVG coordinate system", () => {
    expect(component).toContain('class="pawn-symbol" :symbol="player.symbol" x="-.82" y="-.82" :size="1.64"');
    expect(component).not.toContain('class="pawn-symbol" :symbol="player.symbol" x="-.82" y="-.82" width=');
    expect(component).not.toContain("pawn-symbol-host");
    expect(theme).toMatch(/\.pawn-symbol\.player-token-icon\s*\{/);
  });

  it("uses an app-styled shell and a separate active-player ring", () => {
    expect(component).toContain('class="pawn-shell"');
    expect(component).toContain('class="pawn-active-ring"');
    expect(component).toContain('fill="#081f33" :stroke="player.color"');
    expect(theme).toMatch(/\.pawn-active-ring\.active\s*\{\s*opacity:\s*1/s);
  });

  it("anchors tokens to the inner board edge instead of covering tile labels", () => {
    expect(component).toContain('if (index < COLS) return { x: tileWidth.value / 2 + tangentOffset, y: -inwardOffset };');
    expect(component).toContain('return { x: -inwardOffset, y: tileHeight / 2 + tangentOffset };');
    expect(component).not.toContain('const center = { x: tileWidth.value / 2, y: tileHeight / 2 };');
  });

  it("renders the Lucide icon directly as a nested SVG", () => {
    expect(component).toContain('<PlayerTokenIcon class="pawn-symbol"');
    expect(component).not.toContain('foreignObject class="pawn-symbol');
  });
});