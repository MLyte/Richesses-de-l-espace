import { ASSETS, BOARD, SECTORS, type AssetId, type SectorId } from "@richesses-espace/game";
import type { PlayerGameView, PublicGameView, PublicPlayerView } from "@richesses-espace/protocol";

export type MobilePreviewPlayerId = "orion" | "lyra";

const orionAssets = ["xylem-fibers-vesta", "stellar-cobalt-vesta", "algal-biomass-vesta", "cellular-proteins-vesta"] as AssetId[];
const lyraAssets = ["aluminous-regolith-mars", "synthetic-stimulants-mars", "water-ice-mars"] as AssetId[];

function influence(): Record<SectorId, number> {
  return Object.fromEntries(SECTORS.map((sector) => [sector.id, 0])) as Record<SectorId, number>;
}

function player(input: Omit<PublicPlayerView, "sectorInfluence">): PublicPlayerView {
  return { ...input, sectorInfluence: influence() };
}

export function createMobilePreviewGame(): PublicGameView {
  const landingAssetId = "algal-biomass-vesta" as AssetId;
  const landingPosition = BOARD.findIndex((space) => space.type === "asset" && space.assetId === landingAssetId);
  const orionPosition = BOARD.findIndex((space) => space.type === "asset" && space.assetId === "stellar-cobalt-vesta");
  const players = [
    player({ id: "orion", name: "Orion", color: "#3784a6", symbol: "cat", connected: true, ready: true, position: orionPosition, lapsCompleted: 0, turnsToSkip: 0, capital: 78, assetIds: orionAssets, leverCount: 0, bankrupt: false, netWorth: 120, allianceId: null, mergedIntoId: null }),
    player({ id: "lyra", name: "Lyra", color: "#e4a72f", symbol: "bird", connected: true, ready: true, position: landingPosition, lapsCompleted: 1, turnsToSkip: 0, capital: 84, assetIds: lyraAssets, leverCount: 0, bankrupt: false, netWorth: 111, allianceId: null, mergedIntoId: null })
  ];

  return {
    code: "PREVIEW",
    displayMode: "MOBILE_ONLY",
    revision: 1,
    status: "PLAYING",
    phase: "WAITING_FOR_END_TURN",
    players,
    activePlayerId: "lyra",
    turnNumber: 8,
    roundNumber: 4,
    ownership: Object.fromEntries([...orionAssets.map((id) => [id, "orion"]), ...lyraAssets.map((id) => [id, "lyra"])]) as Record<AssetId, string>,
    lastRoll: { dice: [5, 2], total: 7 },
    pendingAssetId: null,
    pendingPrice: null,
    pendingPurchase: null,
    pendingLever: null,
    pendingPayment: null,
    auction: null,
    tradeOffer: null,
    lastCard: null,
    landedSpaceId: BOARD[landingPosition]?.id ?? null,
    landedAssetId: landingAssetId,
    pauseReason: null,
    pausePlayerId: null,
    recentEvents: [],
    board: BOARD,
    joinUrls: [],
    winnerId: null,
    finishReason: null
  };
}

export function createMobilePreviewPlayer(playerId: MobilePreviewPlayerId): PlayerGameView {
  return {
    playerId,
    token: `mobile-preview-${playerId}`,
    isHost: playerId === "orion",
    allowedActions: playerId === "lyra" ? ["END_TURN", "PROPOSE_TRADE"] : ["PROPOSE_TRADE"],
    leverIds: [],
    pendingLever: null
  };
}
