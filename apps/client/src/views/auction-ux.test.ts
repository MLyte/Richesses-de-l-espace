import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const playerView = readFileSync(fileURLToPath(new URL("./PlayerView.vue", import.meta.url)), "utf8");
const displayView = readFileSync(fileURLToPath(new URL("./DisplayView.vue", import.meta.url)), "utf8");
const countdown = readFileSync(fileURLToPath(new URL("../components/AuctionCountdown.vue", import.meta.url)), "utf8");
const store = readFileSync(fileURLToPath(new URL("../stores/game.ts", import.meta.url)), "utf8");

describe("fast auction experience", () => {
  it("offers one-tap bids and keeps custom amounts secondary", () => {
    expect(playerView).toContain("Enchérir à {{ recommendedBid }}");
    expect(playerView).toContain('class="quick-bids"');
    expect(playerView).toContain("Autre montant");
    expect(playerView).toContain("[1, 3, 5]");
  });

  it("shows the authoritative deadline on phones and the shared display", () => {
    expect(playerView).toContain('<AuctionCountdown :deadline="store.game.auction.deadline"');
    expect(displayView).toContain('<AuctionCountdown :deadline="store.game.auction.deadline"');
    expect(countdown).toContain('role="timer"');
    expect(countdown).toContain("remainingSeconds");
  });

  it("keeps individual bids out of persistent and mobile notifications", () => {
    expect(store).toMatch(/silentNotificationTypes[^\n]+"auction_bid"/);
    expect(playerView).toMatch(/quietMobileEventTypes[^\n]+"auction_bid"/);
  });

  it("locks bidding after passing and explains the completed sale", () => {
    expect(playerView).toContain("auctionPassPending");
    expect(playerView).toContain("@click=\"passCurrentAuction\"");
    expect(playerView).toContain("Voici qui remporte quoi.");
    expect(playerView).toContain("Continuer · terminer le tour");
    expect(displayView).toContain("Attribution des concessions");
    expect(displayView).toContain("peut maintenant terminer son tour");
  });
});
