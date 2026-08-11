export type ResourceFamilyId = "minerals" | "biospheres" | "energies" | "volatiles" | "networks";
/** @deprecated Use ResourceFamilyId. Kept for wire compatibility. */
export type SectorId = ResourceFamilyId;
export type AssetId = string;
export type PlayerId = string;

export interface ResourceFamily { id: ResourceFamilyId; name: string; shortName: string; color: string; icon: string }
export type Sector = ResourceFamily;
export interface SpaceConcession {
  id: AssetId; name: string; worldId: string; systemId: string; stellarSectorId: string;
  resourceId: string; familyId: ResourceFamilyId; sharePercent: number; purchasePrice: number; imageId: string;
  /** @deprecated Compatibility aliases removed from all presentation copy. */
  countryId: string; hub: string; sectorId: ResourceFamilyId; share: number; basePrice: number;
}
export type Asset = SpaceConcession;

export type SpecialSpaceKind = "trend" | "joker" | "auction" | "dividend" | "regional_choice" | "global_choice" | "customs";
type BoardCoordinates = { id: string; name: string; x: number; y: number };
export type BoardSpace =
  | (BoardCoordinates & { type: "hub" })
  | (BoardCoordinates & { type: "asset"; assetId: AssetId; worldId: string; resourceId: string })
  | (BoardCoordinates & { type: "special"; kind: "dividend"; resourceId: string })
  | (BoardCoordinates & { type: "special"; kind: "regional_choice"; regionName: string; sectorIds: string[]; continents: string[] })
  | (BoardCoordinates & { type: "special"; kind: Exclude<SpecialSpaceKind, "dividend" | "regional_choice"> });

export type GamePhase = "LOBBY" | "WAITING_FOR_ROLL" | "WAITING_FOR_PURCHASE" | "WAITING_FOR_LEVER_PURCHASE" | "WAITING_FOR_PAYMENT" | "AUCTION" | "WAITING_FOR_TRADE" | "WAITING_FOR_END_TURN" | "PAUSED" | "FINISHED";

export interface PlayerState {
  id: PlayerId; name: string; color: string; symbol: string; connected: boolean; ready: boolean;
  position: number; lapsCompleted: number; turnsToSkip: number; capital: number; assetIds: AssetId[]; leverIds: string[]; bankrupt: boolean;
  allianceId: string | null; mergedIntoId: PlayerId | null;
}

export interface PurchaseDecision {
  type: "purchase"; source: "classic" | "regional" | "global"; playerId: PlayerId;
  countryId: string | null; resourceId: string | null; label: string;
  availableAssetIds: AssetId[]; maxAssets: number;
}
export interface PaymentDecision {
  type: "payment"; payerId: PlayerId; recipientId: PlayerId; assetId: AssetId; resourceId: string; amount: number;
}
export interface LeverPurchaseDecision { playerId: PlayerId; leverId: string; price: number }

export interface AuctionState {
  mode: "selection" | "bidding"; sellerId: PlayerId; bankSale: boolean; targetCount: number; redDie: number;
  assetId: AssetId; selectedAssetIds: AssetId[]; lots: AssetId[][]; currentLotIndex: number;
  minimumBid: number; currentBid: number; leaderId: PlayerId | null;
  eligiblePlayerIds: PlayerId[]; passedPlayerIds: PlayerId[]; deadline: number | null;
}

export interface TradeOffer {
  id: string; proposerId: PlayerId; targetId: PlayerId;
  kind?: "trade" | "alliance"; allianceTax?: number;
  offeredResourceId: string | null; requestedResourceId: string | null;
  offeredCredits: number; requestedCredits: number;
  returnPhase: "WAITING_FOR_ROLL" | "WAITING_FOR_PAYMENT" | "WAITING_FOR_END_TURN";
}

export type FinishReason = "ADMIN" | "LAST_SOLVENT";

export type GameEventType = "player_joined" | "player_ready" | "game_started" | "game_restarted" | "dice_rolled" | "double_tax_paid" | "pawn_moved" | "space_landed" | "purchase_offered" | "asset_visited" | "payment_due" | "payment_completed" | "asset_purchased" | "purchase_passed" | "trend_drawn" | "lever_offered" | "lever_drawn" | "lever_passed" | "lever_used" | "auction_started" | "auction_bid" | "auction_passed" | "auction_won" | "trade_proposed" | "trade_accepted" | "trade_rejected" | "player_bankrupt" | "dividend_received" | "customs_applied" | "turn_skipped" | "turn_started" | "game_paused" | "game_resumed" | "game_finished";

export type PauseReason = "ADMIN" | "PLAYER_DISCONNECTED";

export interface GameEvent {
  id: number; type: GameEventType; message: string; playerId?: PlayerId;
  data?: Record<string, string | number | boolean>;
}

export interface GameState {
  id: string; code: string; revision: number; status: "LOBBY" | "PLAYING" | "FINISHED";
  phase: GamePhase; previousPhase: GamePhase | null; pauseReason: PauseReason | null; pausePlayerId: PlayerId | null; players: PlayerState[];
  activePlayerId: PlayerId | null; turnNumber: number; roundNumber: number;
  ownership: Record<AssetId, PlayerId>;
  lastRoll: { dice: [number, number]; total: number } | null;
  pendingAction: PurchaseDecision | null; pendingLever: LeverPurchaseDecision | null; pendingPayment: PaymentDecision | null; paymentQueue: PaymentDecision[];
  auction: AuctionState | null; tradeOffer: TradeOffer | null;
  trendDeck: string[]; leverDeck: string[]; lastCard: { kind: "trend" | "lever"; id: string } | null;
  landedSpaceId: string | null; landedAssetId: AssetId | null; recentEvents: GameEvent[]; rngState: number;
  winnerId: PlayerId | null; finishReason: FinishReason | null;
}
