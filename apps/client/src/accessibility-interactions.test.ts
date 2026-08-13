import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const player = read("./views/PlayerView.vue");
const display = read("./views/DisplayView.vue");
const errorToast = read("./components/ErrorToast.vue");
const modalFocus = read("./composables/useAccessibleModal.ts");
const routeMap = read("./components/MobileRouteMap.vue");
const dice = read("./components/DiceAnimation.vue");

describe("WCAG interaction semantics", () => {
  it("names selectable colors and exposes selection state", () => {
    expect(player).toContain(':aria-label="colorLabels[choice]"');
    expect(player).toContain(':aria-pressed="color === choice"');
    expect(player).toContain(':aria-pressed="symbol === choice.id"');
  });

  it("announces dismissible errors with a keyboard-operable control", () => {
    expect(errorToast).toContain('role="alert"');
    expect(errorToast).toContain('aria-live="assertive"');
    expect(errorToast).toContain('class="error-toast__dismiss"');
    expect(errorToast).toContain('aria-label="Fermer le message d’erreur"');
  });

  it("traps modal focus, supports Escape and restores the opener", () => {
    expect(modalFocus).toContain('event.key === "Escape"');
    expect(modalFocus).toContain('event.key !== "Tab"');
    expect(modalFocus).toContain("opener?.focus()");
    expect(player).toContain('role="dialog" aria-modal="true"');
  });

  it("reports fullscreen state and the current game state", () => {
    expect(display).toContain(':aria-pressed="fullscreen"');
    expect(display).toContain("Quitter le plein écran");
    expect(player).toContain('role="status" aria-live="polite"');
  });

  it("respects reduced motion in animated dice and route scrolling", () => {
    expect(dice).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(routeMap).toContain('reducedMotion.matches ? "auto" : behavior');
  });

  it("separates purchase percentages and keeps units attached to their values", () => {
    expect(player).toContain('class="title-selection__copy"');
    expect(player).toContain("{{ title.share }}&nbsp;%");
    expect(player).toContain("{{ title.basePrice }}&nbsp;cr.");
    expect(player).toContain("{{ purchaseTotal }}&nbsp;crédits");
  });
});
