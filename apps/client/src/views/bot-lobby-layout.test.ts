import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const createGameView = readFileSync(fileURLToPath(new URL("./CreateGameView.vue", import.meta.url)), "utf8");
const displayView = readFileSync(fileURLToPath(new URL("./DisplayView.vue", import.meta.url)), "utf8");
const styles = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../theme-space.css", import.meta.url)), "utf8");

describe("robot lobby and status UI", () => {
  it("gives the phone host accessible add, profile and remove controls", () => {
    expect(playerView).toContain("Joueurs robots");
    expect(playerView).toContain("store.addBot(newBotProfile.value)");
    expect(playerView).toContain("store.updateBot(playerId");
    expect(playerView).toContain("store.removeBot(playerId)");
    expect(playerView).toContain("store.game.players.length >= 6");
    expect(playerView).toContain(":aria-label=\"`Profil de ${player.name}`\"");
    expect(playerView).toContain(":aria-label=\"`Retirer ${player.name}`\"");
  });

  it("lets a local player choose one to five robots before launch", () => {
    expect(playerView).toContain("Nombre de robots");
    expect(playerView).toContain('v-for="count in 5"');
    expect(playerView).toContain("store.join(code, name.value, color.value, symbol.value, botCount.value)");
    expect(playerView).toContain('route.query.new === "1"');
    expect(createGameView).toContain("Nouvelle expédition · choisir les robots");
    expect(createGameView).toContain("createMobileGame(true)");
  });

  it("identifies robots and exposes their thinking state on phone and TV", () => {
    for (const source of [playerView, displayView]) {
      expect(source).toContain("botProfileLabels");
      expect(source).toContain("botThinkingPlayer");
      expect(source).toContain("réfléchit");
      expect(source).toMatch(/import \{[^}]*Bot[^}]*\} from "@lucide\/vue"/);
    }
    expect(displayView).toContain("Robot · {{ botProfileLabels[player.botProfile!] }}");
    expect(styles).toContain(".bot-label");
  });

  it("keeps lobby help and in-game resource access out of the mobile action layers", () => {
    expect(playerView).toMatch(/\.phone-lobby > \.primary-button\s*\{[^}]*position:\s*static[^}]*width:\s*100%/s);
    expect(playerView).toMatch(/\.controller-screen:not\(\.controller-screen--mobile-only\) > \.portfolio-fab\s*\{[^}]*position:\s*static/s);
  });

  it("keeps mobile forms and dialogs clear of the keyboard and safe areas", () => {
    expect(playerView).toMatch(/\.join-form > \.primary-button,[\s\S]*\.trade-form > \.wide-button\s*\{[^}]*position:\s*static/s);
    expect(playerView).toMatch(/\.trade-backdrop\s*\{[^}]*var\(--safe-top\)[^}]*var\(--safe-bottom\)/s);
    expect(theme).toMatch(/@media \(max-width: 760px\)[\s\S]*\.help-dialog\s*\{[^}]*max-height:[^}]*var\(--safe-top\)[^}]*var\(--safe-bottom\)/s);
  });

  it("provides at least 44px targets for compact mobile controls", () => {
    expect(playerView).toMatch(/\.bot-row-actions button\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
    expect(styles).toMatch(/\.custom-bid summary\s*\{[^}]*min-height:\s*44px/s);
    expect(styles).toMatch(/\.help-close\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  });
});
