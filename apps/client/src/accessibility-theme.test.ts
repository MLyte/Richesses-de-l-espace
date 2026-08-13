import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255) as Rgb;
}

function luminance(hex: string): number {
  const [red, green, blue] = rgb(hex).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) as Rgb;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

const theme = readFileSync(fileURLToPath(new URL("./theme-space.css", import.meta.url)), "utf8");

describe("WCAG 2.2 AA rendered theme palette", () => {
  it.each([
    ["page primary text", "#f3f8fc", "#06111f", 4.5],
    ["resource primary text", "#f3f8fc", "#0b243a", 4.5],
    ["resource secondary text", "#c9e8f4", "#0b243a", 4.5],
    ["primary button label", "#06111f", "#f2674a", 4.5],
    ["panel button label", "#f3f8fc", "#15344d", 4.5],
    ["disabled action label", "#b9d8e5", "#132b3d", 4.5],
    ["menu label", "#f3f8fc", "#102a43", 4.5],
    ["portfolio shortcut", "#f3f8fc", "#124a68", 4.5],
    ["payment summary primary text", "#f3f8fc", "#0b243a", 4.5],
    ["payment summary secondary text", "#c9e8f4", "#0b243a", 4.5],
    ["trade summary debit", "#f2674a", "#0b243a", 4.5],
    ["auction selection label", "#f3f8fc", "#0b243a", 4.5],
    ["error message", "#ffffff", "#a83d3d", 4.5],
    ["light die number and pips", "#06111f", "#f3f8fc", 4.5],
    ["coral die number and pips", "#06111f", "#f2674a", 4.5],
    ["coral accent on resource panel", "#f2674a", "#0b243a", 4.5],
    ["cyan accent on resource panel", "#35d0e2", "#0b243a", 4.5],
    ["yellow accent on resource panel", "#f6c64d", "#0b243a", 4.5],
    ["violet accent on resource panel", "#9785ed", "#0b243a", 4.5],
    ["progress fill", "#e5f6fc", "#476579", 3],
    ["resource outline", "#72a9c2", "#0b243a", 3],
    ["disabled control outline", "#6b899c", "#132b3d", 3]
  ])("keeps %s above its required contrast", (_label, foreground, background, minimum) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(minimum as number);
  });

  it("binds the compliant die colors to the selectors rendered by the game", () => {
    expect(theme).toMatch(/\.dice-result span:not\(\.red-die\)\s*\{[^}]*color:\s*#06111f[^}]*background:\s*#f3f8fc/s);
    expect(theme).toMatch(/\.dice-result \.red-die\s*\{[^}]*color:\s*#06111f[^}]*background:\s*#f2674a/s);
    expect(theme).toMatch(/\.die-face\s*\{[^}]*color:\s*#06111f[^}]*background:\s*#f3f8fc/s);
    expect(theme).toMatch(/\.die-face--coral\s*\{[^}]*color:\s*#06111f[^}]*background:\s*#f2674a/s);
  });

  it("keeps payment and trade summaries on opaque dark surfaces", () => {
    expect(theme).toMatch(/\.payment-summary\s*\{[^}]*background:\s*#0b243a/s);
    expect(theme).toMatch(/\.trade-common-grid > div,\s*\.trade-summary > div,\s*\.auction-selection label\s*\{[^}]*background:\s*#0b243a/s);
    expect(theme).toMatch(/\.auction-selection label\.selected\s*\{[^}]*background:\s*#15344d/s);
  });

  it("keeps secondary action controls in the dark spatial palette", () => {
    expect(theme).toMatch(/\.title-actions\s*\{[^}]*background:\s*linear-gradient\(145deg, #153f5d, #0b243a\)/s);
    expect(theme).toMatch(/\.title-actions button\s*\{[^}]*color:\s*#f3f8fc[^}]*background:\s*#0b243a/s);
    expect(theme).not.toContain(".title-actions button, .symbol-picker button");
  });

  it("uses large, keyboard-visible checkbox controls in selection lists", () => {
    expect(theme).toMatch(/\.auction-selection input\s*\{[^}]*appearance:\s*none[^}]*width:\s*24px[^}]*height:\s*24px/s);
    expect(theme).toMatch(/\.auction-selection input:checked\s*\{[^}]*background:\s*#35d0e2/s);
    expect(theme).toMatch(/\.auction-selection input:focus-visible\s*\{[^}]*outline:\s*3px solid #f6c64d/s);
  });

  it("keeps the mobile action dock in the dark spatial palette", () => {
    expect(theme).toMatch(/\.controller-screen \.action-row\s*\{[^}]*background:\s*rgba\(5, 22, 38, \.98\)/s);
  });

  it("keeps all form fields and dynamic status labels on opaque compliant surfaces", () => {
    expect(theme).toMatch(/\.bid-controls input,[\s\S]*\.trade-form select,[\s\S]*\.join-form input\s*\{[^}]*color:\s*#f3f8fc[^}]*background:\s*#071827/s);
    expect(theme).toMatch(/\.landing-notice__status,[\s\S]*\.event-notification small\s*\{[^}]*color:\s*#f3f8fc[^}]*background:\s*#0b243a/s);
  });

  it("does not reintroduce the cream theme in the final theme layer", () => {
    expect(theme.toLowerCase()).not.toContain("#fffdf4");
  });

  it("restores document scrolling for mobile zoom and low landscape viewports", () => {
    expect(theme).toMatch(/body:has\(\.phone-shell \.controller-screen\),[\s\S]*overflow-y:\s*visible/s);
    expect(theme).toMatch(/\.controller-screen--map > \.mobile-map-overlay:not\([\s\S]*overflow-y:\s*visible/s);
  });

  it("does not add a second viewport or legacy bottom padding below controller pages", () => {
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen\)\s*\{[^}]*min-height:\s*var\(--app-viewport-height\)[^}]*padding-bottom:\s*var\(--safe-bottom\)/s);
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen\) \.controller-screen\s*\{[^}]*min-height:\s*calc\(var\(--app-viewport-height\) - var\(--phone-header-height\) - var\(--safe-top\)\)/s);
  });

  it("keeps contextual actions sticky without removing the map from document flow", () => {
    expect(theme).toMatch(/\.controller-screen--mobile-only\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
    expect(theme).toMatch(/\.controller-screen--map > :not\(\.mobile-map-panel\):not\(\.mobile-map-overlay\)[^}]*display:\s*none/s);
    expect(theme).toMatch(/\.mobile-map-panel\s*\{[^}]*position:\s*relative[^}]*z-index:\s*var\(--layer-map\)/s);
    expect(theme).toMatch(/\.controller-screen--map > \.action-card--roll,[\s\S]*\.controller-screen--map > \.end-turn-action\s*\{[^}]*position:\s*sticky[^}]*z-index:\s*var\(--layer-action\)/s);
  });

  it("keeps TV overlays centered and mobile landscape actions in normal flow", () => {
    expect(theme).toMatch(/\.pause-overlay,[\s\S]*inset:\s*auto !important;[\s\S]*top:\s*50% !important;[\s\S]*left:\s*50% !important;/s);
    expect(theme).toMatch(/\.controller-screen--map > \.mobile-map-overlay :is\([\s\S]*\.action-row,[\s\S]*\.liquidation-list[\s\S]*\)\s*\{[^}]*position:\s*static/s);
  });

  it("prevents narrow payment cards and illustrated card contrast regressions", () => {
    expect(theme).toMatch(/\.controller-screen \.payment-action \.asset-card\s*\{[^}]*width:\s*100%[^}]*aspect-ratio:\s*auto/s);
    expect(theme).toMatch(/\.asset-card__wash\s*\{[^}]*rgba\(4, 15, 28, \.76\)[^}]*mix-blend-mode:\s*normal/s);
  });

  it("keeps narrow headers, short states and supporting pages readable", () => {
    expect(theme).toMatch(/\.controller-screen--map > \.mobile-map-overlay:not\([\s\S]*position:\s*relative[^}]*overflow-y:\s*visible/s);
    expect(theme).toMatch(/\.phone-shell:has\(\.controller-screen--mobile-only\) \.phone-resource-button\s*\{[^}]*margin-right:\s*auto/s);
    expect(theme).toMatch(/@media \(max-width: 340px\)[\s\S]*\.phone-header \.brand > span:last-child\s*\{[^}]*display:\s*none/s);
    expect(theme).toMatch(/\.credits-shell \.back-link,[\s\S]*\.credits-grid a\s*\{[^}]*min-height:\s*44px[^}]*font-size:\s*\.875rem/s);
  });
});
