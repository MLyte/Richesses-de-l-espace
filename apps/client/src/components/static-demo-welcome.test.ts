import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./StaticDemoWelcomeDialog.vue", import.meta.url), "utf8");

describe("local solo welcome dialog", () => {
  it("appears once per browser session", () => {
    expect(source).toContain("window.sessionStorage.getItem(SESSION_KEY)");
    expect(source).toContain("window.sessionStorage.setItem(SESSION_KEY, \"1\")");
  });

  it("does not force a timed reading delay", () => {
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain(":disabled");
    expect(source).toContain("Jouer contre le robot");
  });

  it("explains the playable solo mode", () => {
    expect(source).toContain("Votre identité, puis une vraie partie");
    expect(source).toContain("Choisissez votre pseudo, votre couleur et votre animal");
    expect(source).toContain("Le robot joue automatiquement");
    expect(source).toContain("Son nom de constellation, sa couleur et son animal sont tirés au hasard");
    expect(source).toContain("Progression sauvegardée");
  });
});
