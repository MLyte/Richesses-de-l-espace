export type LeverKind = "auction_exemption";
export interface LeverCard { id: string; title: string; description: string; kind: LeverKind; value: number }

export const LEVER_CARDS: readonly LeverCard[] = Array.from({ length: 13 }, (_, index) => ({
  id: `joker-${String(index + 1).padStart(2, "0")}`,
  title: "Clause d’exemption",
  description: "Annule une vente forcée avant la sélection des lots.",
  kind: "auction_exemption" as const,
  value: 0
}));
