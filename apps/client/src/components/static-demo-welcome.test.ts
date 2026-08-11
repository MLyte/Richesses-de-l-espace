import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./StaticDemoWelcomeDialog.vue", import.meta.url), "utf8");

describe("static demo welcome dialog", () => {
  it("appears once per browser session", () => {
    expect(source).toContain("window.sessionStorage.getItem(SESSION_KEY)");
    expect(source).toContain("window.sessionStorage.setItem(SESSION_KEY, \"1\")");
  });

  it("requires the complete three-second countdown", () => {
    expect(source).toContain("const remaining = ref(3)");
    expect(source).toContain("remaining.value = Math.max(0, remaining.value - 1)");
    expect(source).toContain(':disabled="remaining > 0"');
    expect(source).toContain("{{ remaining }}");
  });

  it("explains the limitations of the static beta", () => {
    expect(source).toContain("Aucun appareil n’est synchronisé");
    expect(source).toContain("Le QR code et le multijoueur en temps réel ne sont pas encore actifs");
    expect(source).toContain("Démo UX");
  });
});
