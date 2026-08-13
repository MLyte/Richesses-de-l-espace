import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./CreateGameView.vue", import.meta.url)), "utf8");

describe("create-game mobile hierarchy", () => {
  it("prioritizes the phone journey and demotes the TV preview on narrow screens", () => {
    expect(source).toContain(".mode-card--mobile { order: -1; }");
    expect(source).toContain("Optionnel · recommandé sur grand écran.");
    expect(source).toContain(".mode-card--tv > span:nth-of-type(3) { display: none; }");
    expect(source).toContain(".mode-card--tv .mode-card__mobile-note { display: block;");
  });

  it("shows the date-based build version on the homepage", () => {
    expect(source).toContain('meta[name="richesses-build-date"]');
    expect(source).toContain('class="create-game__version"');
    expect(source).toContain("Version {{ buildVersion }}");
  });
});
