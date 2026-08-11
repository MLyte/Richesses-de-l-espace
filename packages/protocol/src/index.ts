import type { AssetId, AuctionState, BoardSpace, FinishReason, GameEvent, GamePhase, SectorId, TradeOffer } from "@richesses-espace/game";

export type DisplayMode = "TV" | "MOBILE_ONLY";

export interface PublicPlayerView {
  id: string; name: string; color: string; symbol: string; connected: boolean; ready: boolean;
  position: number; lapsCompleted: number; turnsToSkip: number; capital: number; assetIds: AssetId[]; leverCount: number; bankrupt: boolean; netWorth: number;
  allianceId: string | null; mergedIntoId: string | null;
  sectorInfluence: Record<SectorId, number>;
}

export interface PublicGameView {
  code: string; displayMode: DisplayMode; revision: number; status: "LOBBY" | "PLAYING" | "FINISHED";
  phase: GamePhase; players: PublicPlayerView[]; activePlayerId: string | null;
  turnNumber: number; roundNumber: number; ownership: Record<AssetId, string>;
  lastRoll: { dice: [number, number]; total: number } | null;
  pendingAssetId: AssetId | null; pendingPrice: number | null;
  pendingPurchase: { source: "classic" | "regional" | "global"; countryId: string | null; resourceId: string | null; label: string; availableAssetIds: AssetId[]; maxAssets: number } | null;
  pendingLever: { price: number } | null;
  pendingPayment: { payerId: string; recipientId: string; assetId: AssetId; resourceId: string; amount: number; payableAmount: number } | null;
  auction: AuctionState | null;
  tradeOffer: TradeOffer | null;
  lastCard: { kind: "trend" | "lever"; id: string } | null;
  landedSpaceId: string | null; landedAssetId: AssetId | null; pauseReason: "ADMIN" | "PLAYER_DISCONNECTED" | null; pausePlayerId: string | null;
  recentEvents: GameEvent[]; board: readonly BoardSpace[]; joinUrls: string[];
  winnerId: string | null; finishReason: FinishReason | null;
}

export type PlayerAction = "SET_READY" | "ROLL_DICE" | "BUY_ASSET" | "PASS_ASSET" | "BUY_LEVER" | "PASS_LEVER" | "PAY_RETURNS" | "USE_LEVER" | "DECLARE_BANKRUPTCY" | "SELECT_AUCTION_ASSETS" | "BID" | "PASS_BID" | "PROPOSE_TRADE" | "ACCEPT_TRADE" | "REJECT_TRADE" | "END_TURN";
export interface PlayerGameView { playerId: string; token: string; isHost: boolean; allowedActions: PlayerAction[]; leverIds: string[]; pendingLever: { leverId: string; price: number } | null }
export interface TradeProposalPayload { targetId: string; kind?: "trade" | "alliance"; offeredResourceId: string | null; requestedResourceId: string | null; offeredCredits: number; requestedCredits: number }
export interface CommandResult<T = undefined> { ok: boolean; data?: T; error?: { code: string; message: string } }
export interface SessionResult { code: string; token: string; role: "admin" | "player"; playerId?: string; isHost?: boolean; displayMode?: DisplayMode; joinUrls?: string[] }

export const PLAYER_COLORS = ["#e05f42", "#3784a6", "#75a341", "#e4a72f", "#9666b4", "#28a394"] as const;
export const PLAYER_SYMBOLS = [
  { id: "cat", label: "Chat" },
  { id: "dog", label: "Chien" },
  { id: "bird", label: "Oiseau" },
  { id: "fish", label: "Poisson" },
  { id: "rabbit", label: "Lapin" },
  { id: "turtle", label: "Tortue" },
  { id: "snail", label: "Escargot" },
  { id: "squirrel", label: "Écureuil" },
  { id: "rat", label: "Rat" },
  { id: "bug", label: "Insecte" },
  { id: "worm", label: "Ver de terre" },
  { id: "shrimp", label: "Crevette" }
] as const;
