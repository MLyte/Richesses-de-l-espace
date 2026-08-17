import { describe, expect, it } from "vitest";
import { ASSETS } from "@richesses-espace/game";
import { assertMobilePreviewIntegrity, createMobilePreviewGame } from "./mobile-preview";

describe("aperçu mobile", () => {
  it("référence uniquement des concessions, propriétaires et positions valides", () => {
    const game = createMobilePreviewGame();
    const assetIds = new Set(ASSETS.map((asset) => asset.id));

    expect(() => assertMobilePreviewIntegrity(game)).not.toThrow();
    expect(game.players.every((player) => player.assetIds.every((id) => assetIds.has(id)))).toBe(true);
    expect(game.players.every((player) => player.position >= 0 && player.position < game.board.length)).toBe(true);

    const landedSpace = game.board.find((space) => space.id === game.landedSpaceId);
    expect(landedSpace?.type).toBe("asset");
    if (landedSpace?.type === "asset") expect(landedSpace.assetId).toBe(game.landedAssetId);
  });

  it("échoue explicitement si la case d’arrivée devient incohérente", () => {
    const game = createMobilePreviewGame();
    expect(() => assertMobilePreviewIntegrity({ ...game, landedSpaceId: "case-inexistante" })).toThrow(/case d’arrivée/);
  });
});
