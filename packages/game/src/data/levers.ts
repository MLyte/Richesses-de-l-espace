export type LeverKind = "auction_exemption";
export interface LeverCard { id: string; title: string; description: string; kind: LeverKind; value: number }

const TECHNOLOGY_NAMES = ["Propulseur d’urgence", "Droit de priorité orbitale", "Brouilleur de balise", "Couloir hyperspatial", "Licence diplomatique", "Voile de dérivation", "Transpondeur fantôme", "Fenêtre gravitationnelle", "Saut de Lagrange", "Accord de transit", "Balise quantique", "Réserve de poussée", "Protocole d’évasion"] as const;

export const TECHNOLOGIES: readonly LeverCard[] = TECHNOLOGY_NAMES.map((title, index) => ({
  id: `technology-${String(index + 1).padStart(2, "0")}`,
  title,
  description: "Évite une vente forcée avant la sélection des lots, puis retourne sous la pile.",
  kind: "auction_exemption" as const,
  value: 0
}));

/** @deprecated Use TECHNOLOGIES. */
export const LEVER_CARDS = TECHNOLOGIES;
