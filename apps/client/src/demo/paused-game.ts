import { ASSETS, BOARD, SECTORS, type AssetId, type SectorId } from "@richesses-espace/game";
import type { PlayerGameView, PublicGameView, PublicPlayerView } from "@richesses-espace/protocol";

const orionAssets = ["xylem-fibers-vesta", "stellar-cobalt-vesta", "algal-biomass-vesta", "cellular-proteins-vesta"] as AssetId[];
const lyraAssets = ["aluminous-regolith-mars", "synthetic-stimulants-mars", "water-ice-mars"] as AssetId[];

function influence(): Record<SectorId, number> {
  return Object.fromEntries(SECTORS.map((sector) => [sector.id, 0])) as Record<SectorId, number>;
}

function player(input: Omit<PublicPlayerView, "sectorInfluence">): PublicPlayerView {
  return { ...input, sectorInfluence: influence() };
}

export function pausedDemoGame(): PublicGameView {
  const players = [
    player({ id: "orion", name: "Orion", color: "#3784a6", symbol: "cat", connected: true, ready: true, position: 24, lapsCompleted: 0, turnsToSkip: 0, capital: 78, assetIds: orionAssets, leverCount: 0, bankrupt: false, netWorth: 120, allianceId: null, mergedIntoId: null }),
    player({ id: "lyra", name: "Lyra", color: "#e4a72f", symbol: "bird", connected: false, ready: true, position: 19, lapsCompleted: 0, turnsToSkip: 0, capital: 84, assetIds: lyraAssets, leverCount: 0, bankrupt: false, netWorth: 111, allianceId: null, mergedIntoId: null })
  ];
  return {
    code: "DEMO", displayMode: "TV", revision: 42, status: "PLAYING", phase: "PAUSED", players,
    activePlayerId: "lyra", turnNumber: 7, roundNumber: 4,
    ownership: Object.fromEntries([...orionAssets.map((id) => [id, "orion"]), ...lyraAssets.map((id) => [id, "lyra"])]) as Record<AssetId, string>,
    lastRoll: { dice: [4, 3], total: 7 }, pendingAssetId: null, pendingPrice: null, pendingPurchase: null, pendingLever: null, pendingPayment: null,
    auction: null, tradeOffer: null, lastCard: null, landedSpaceId: BOARD[24]?.id ?? null, landedAssetId: ASSETS.find((asset) => asset.id === "algal-biomass-vesta")?.id ?? null,
    pauseReason: "PLAYER_DISCONNECTED", pausePlayerId: "lyra", recentEvents: [], board: BOARD, joinUrls: [], winnerId: null, finishReason: null
  };
}

export function pausedDemoPlayer(playerId: "orion" | "lyra"): PlayerGameView {
  return { playerId, token: `visual-demo-${playerId}`, isHost: playerId === "orion", allowedActions: [], leverIds: [], pendingLever: null };
}
/** Une partie déjà engagée, destinée à prévisualiser l’écran commun hors pause. */
export function activeDemoGame(): PublicGameView {
  const paused = pausedDemoGame();
  const landingAssetId = "algal-biomass-vesta" as AssetId;
  const landingPosition = BOARD.findIndex((space) => space.type === "asset" && space.assetId === landingAssetId);
  const players = paused.players.map((member) => member.id === "lyra"
    ? { ...member, connected: true, position: landingPosition, lapsCompleted: 1 }
    : { ...member, position: BOARD.findIndex((space) => space.type === "asset" && space.assetId === "stellar-cobalt-vesta") });

  return {
    ...paused,
    revision: 43,
    phase: "WAITING_FOR_END_TURN",
    players,
    activePlayerId: "lyra",
    turnNumber: 8,
    pauseReason: null,
    pausePlayerId: null,
    lastRoll: { dice: [5, 2], total: 7 },
    landedSpaceId: BOARD[landingPosition]?.id ?? null,
    landedAssetId: landingAssetId
  };
}

export function activeDemoPlayer(playerId: "orion" | "lyra"): PlayerGameView {
  return {
    playerId,
    token: `visual-demo-active-${playerId}`,
    isHost: playerId === "orion",
    allowedActions: playerId === "lyra" ? ["END_TURN", "PROPOSE_TRADE"] : ["PROPOSE_TRADE"],
    leverIds: [],
    pendingLever: null
  };
}