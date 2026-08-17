import { ASSETS, BOARD, type AssetId } from "@richesses-espace/game";
import type { PlayerGameView, PublicGameView, PublicPlayerView } from "@richesses-espace/protocol";

export type MobilePreviewPlayerId = "orion" | "lyra";

function requireAsset(resourceId: string, worldId: string): AssetId {
  const asset = ASSETS.find((item) => item.resourceId === resourceId && item.worldId === worldId);
  if (!asset) throw new Error(`Aperçu mobile invalide : concession ${resourceId}/${worldId} introuvable.`);
  return asset.id;
}

function requireAssetPosition(assetId: AssetId): number {
  const position = BOARD.findIndex((space) => space.type === "asset" && space.assetId === assetId);
  if (position < 0) throw new Error(`Aperçu mobile invalide : position de ${assetId} introuvable.`);
  return position;
}

function requireBoardAsset(resourceId: string, occurrence = 0): AssetId {
  const space = BOARD.filter((item) => item.type === "asset" && item.resourceId === resourceId)[occurrence];
  if (!space || space.type !== "asset") throw new Error(`Aperçu mobile invalide : aucune case pour ${resourceId}.`);
  const asset = ASSETS.find((item) => item.id === space.assetId);
  if (!asset) throw new Error(`Aperçu mobile invalide : concession de plateau ${space.assetId} inconnue.`);
  return asset.id;
}

const orionAssets = [
  requireAsset("xylem-fibers", "vesta"),
  requireAsset("stellar-cobalt", "vesta"),
  requireAsset("algal-biomass", "vesta"),
  requireAsset("cellular-proteins", "vesta")
];
const lyraAssets = [
  requireAsset("aluminous-regolith", "mars"),
  requireAsset("synthetic-stimulants", "mars"),
  requireAsset("water-ice", "mars")
];

export function assertMobilePreviewIntegrity(game: PublicGameView): void {
  const assetIds = new Set(ASSETS.map((asset) => asset.id));
  const playerIds = new Set(game.players.map((player) => player.id));
  for (const player of game.players) {
    if (!Number.isInteger(player.position) || player.position < 0 || player.position >= game.board.length) {
      throw new Error(`Aperçu mobile invalide : position de ${player.id} hors plateau.`);
    }
    for (const assetId of player.assetIds) {
      if (!assetIds.has(assetId)) throw new Error(`Aperçu mobile invalide : concession ${assetId} inconnue.`);
      if (game.ownership[assetId] !== player.id) throw new Error(`Aperçu mobile invalide : propriétaire de ${assetId} incohérent.`);
    }
  }
  for (const [assetId, ownerId] of Object.entries(game.ownership)) {
    if (!assetIds.has(assetId as AssetId)) throw new Error(`Aperçu mobile invalide : concession détenue ${assetId} inconnue.`);
    if (!playerIds.has(ownerId)) throw new Error(`Aperçu mobile invalide : propriétaire ${ownerId} inconnu.`);
  }
  if (game.landedAssetId) {
    const landedSpace = game.board.find((space) => space.id === game.landedSpaceId);
    if (!landedSpace || landedSpace.type !== "asset" || landedSpace.assetId !== game.landedAssetId) {
      throw new Error("Aperçu mobile invalide : la case d’arrivée ne correspond pas à la concession.");
    }
  }
}

export function createMobilePreviewGame(): PublicGameView {
  const landingAssetId = requireBoardAsset("algal-biomass", 1);
  const landingPosition = requireAssetPosition(landingAssetId);
  const orionPosition = requireAssetPosition(requireBoardAsset("stellar-cobalt"));
  const players = [
    { id: "orion", name: "Orion", color: "#3784a6", symbol: "cat", connected: true, ready: true, isBot: false, botProfile: null, position: orionPosition, lapsCompleted: 0, turnsToSkip: 0, capital: 78, assetIds: orionAssets, leverCount: 0, bankrupt: false, netWorth: 120, allianceId: null, mergedIntoId: null },
    { id: "lyra", name: "Lyra", color: "#e4a72f", symbol: "bird", connected: true, ready: true, isBot: false, botProfile: null, position: landingPosition, lapsCompleted: 1, turnsToSkip: 0, capital: 84, assetIds: lyraAssets, leverCount: 0, bankrupt: false, netWorth: 111, allianceId: null, mergedIntoId: null }
  ];

  const game: PublicGameView = {
    code: "PREVIEW",
    displayMode: "MOBILE_ONLY",
    revision: 1,
    status: "PLAYING",
    phase: "WAITING_FOR_END_TURN",
    players,
    activePlayerId: "lyra",
    botThinkingPlayerId: null,
    startingRace: { selections: { orion: "inner-system", lyra: "red-belt" }, finishOrder: ["red-belt", "inner-system"], winnerPlayerId: "lyra", raceEndsAt: null, pausedAt: null },
    turnNumber: 8,
    roundNumber: 4,
    ownership: Object.fromEntries([...orionAssets.map((id) => [id, "orion"]), ...lyraAssets.map((id) => [id, "lyra"])]),
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
  assertMobilePreviewIntegrity(game);
  return game;
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
