import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./StaticDemoWelcomeDialog.vue", import.meta.url), "utf8");

describe("static demo welcome dialog", () => {
  it("appears once per browser session", () => {
    expect(source).toContain("window.sessionStorage.getItem(SESSION_KEY)");
    expect(source).toContain("window.sessionStorage.setItem(SESSION_KEY, \"1\")");
  });

  it("does not force a timed reading delay", () => {
    expect(source).not.toContain("setInterval");
    expect(source).not.toContain(":disabled");
    expect(source).toContain("Accéder à la démo");
  });

  it("explains the limitations of the static beta", () => {
    expect(source).toContain("Aucun appareil n’est synchronisé");
    expect(source).toContain("Le QR code et le multijoueur en temps réel ne sont pas encore actifs");
    expect(source).toContain("Démo UX");
  });
});
