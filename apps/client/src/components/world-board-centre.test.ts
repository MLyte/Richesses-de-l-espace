import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const board = readFileSync(fileURLToPath(new URL("./WorldBoard.vue", import.meta.url)), "utf8");

describe("world board centre", () => {
  it("uses the neutral photo without decorative or informational SVG overlays", () => {
    expect(board).not.toContain('class="stellar-map"');
    expect(board).not.toContain('class="board-title"');
    expect(board).not.toContain('class="board-legend"');
    expect(board).not.toContain("EXPLOREZ · NÉGOCIEZ · DOMINEZ");
    expect(board).not.toContain("RESSOURCES COSMIQUES");
  });
});
