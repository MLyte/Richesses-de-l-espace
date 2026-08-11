export interface CosmicEventCard {
  id: string;
  title: string;
  description: string;
  bankDirection: "bank_to_player" | "player_to_bank";
  amount: number;
}

// Les cartes Tendance sont des événements bancaires immédiats. Elles restent
// originales et n’utilisent plus les anciens indices de marché sans effet.
// Le sens du virement est volontairement explicite : un montant signé rendait
// possible l’inversion d’une réception en paiement lors de son interprétation.
export const COSMIC_EVENTS = [
  { id: "colonization-grant", title: "Subvention de colonisation", description: "Recevez 3 crédits pour l’ouverture d’un nouveau module orbital.", bankDirection: "bank_to_player", amount: 3 },
  { id: "biosphere-harvest", title: "Récolte de biosphère", description: "Recevez 2 crédits grâce à un cycle hydroponique exceptionnel.", bankDirection: "bank_to_player", amount: 2 },
  { id: "orbital-maintenance", title: "Maintenance orbitale", description: "Versez 2 crédits à la banque pour stabiliser vos installations.", bankDirection: "player_to_bank", amount: 2 },
  { id: "research-breakthrough", title: "Percée exobiologique", description: "Recevez 4 crédits pour une découverte partagée.", bankDirection: "bank_to_player", amount: 4 },
  { id: "sector-grant", title: "Prime sectorielle", description: "Recevez 2 crédits de soutien interstellaire.", bankDirection: "bank_to_player", amount: 2 },
  { id: "stability-fund", title: "Fonds de stabilisation", description: "Versez 2 crédits à la Banque interstellaire.", bankDirection: "player_to_bank", amount: 2 },
  { id: "supply-contract", title: "Contrat de ravitaillement", description: "Recevez 3 crédits pour une livraison prioritaire.", bankDirection: "bank_to_player", amount: 3 },
  { id: "recycling-loop", title: "Boucle de recyclage", description: "Recevez 2 crédits pour la récupération de matériaux orbitaux.", bankDirection: "bank_to_player", amount: 2 },
  { id: "stellar-storm", title: "Tempête stellaire", description: "Versez 3 crédits pour protéger votre flotte.", bankDirection: "player_to_bank", amount: 3 },
  { id: "productive-docking", title: "Escale productive", description: "Recevez 3 crédits pour la mutualisation d’un anneau d’amarrage.", bankDirection: "bank_to_player", amount: 3 },
  { id: "concession-audit", title: "Audit de concession", description: "Versez 1 crédit pour actualiser vos licences.", bankDirection: "player_to_bank", amount: 1 },
  { id: "deep-space-mission", title: "Mission scientifique", description: "Recevez 4 crédits pour une campagne d’observation lointaine.", bankDirection: "bank_to_player", amount: 4 },
  { id: "corridor-repair", title: "Corridor endommagé", description: "Versez 2 crédits pour restaurer une trajectoire de navigation.", bankDirection: "player_to_bank", amount: 2 },
  { id: "exploration-festival", title: "Festival des explorateurs", description: "Recevez 2 crédits pour le rayonnement de votre consortium.", bankDirection: "bank_to_player", amount: 2 }
] as const satisfies readonly CosmicEventCard[];

export type TrendCard = CosmicEventCard;
/** @deprecated Use COSMIC_EVENTS. */
export const TREND_CARDS = COSMIC_EVENTS;
