export interface TrendCard {
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
export const TREND_CARDS = [
  { id: "storage-rush", title: "Réserves partagées", description: "Recevez 3 crédits pour avoir ouvert vos entrepôts au réseau.", bankDirection: "bank_to_player", amount: 3 },
  { id: "regenerative-season", title: "Saison généreuse", description: "Recevez 2 crédits grâce à une récolte exceptionnelle.", bankDirection: "bank_to_player", amount: 2 },
  { id: "industrial-pause", title: "Maintenance imprévue", description: "Versez 2 crédits à la banque pour remettre vos installations en route.", bankDirection: "player_to_bank", amount: 2 },
  { id: "bio-innovation", title: "Brevet ouvert", description: "Recevez 4 crédits pour une innovation partagée.", bankDirection: "bank_to_player", amount: 4 },
  { id: "shared-dividend", title: "Prime territoriale", description: "Recevez 2 crédits de soutien régional.", bankDirection: "bank_to_player", amount: 2 },
  { id: "liquidity-squeeze", title: "Fonds de stabilisation", description: "Versez 2 crédits au fonds commun.", bankDirection: "player_to_bank", amount: 2 },
  { id: "balanced-demand", title: "Carnet de commandes", description: "Recevez 3 crédits pour une livraison prioritaire.", bankDirection: "bank_to_player", amount: 3 },
  { id: "circular-contracts", title: "Boucle circulaire", description: "Recevez 2 crédits pour la réutilisation de vos matériaux.", bankDirection: "bank_to_player", amount: 2 },
  { id: "storm-delay", title: "Route interrompue", description: "Versez 3 crédits pour détourner votre convoi.", bankDirection: "player_to_bank", amount: 3 },
  { id: "harbor-bonus", title: "Escale productive", description: "Recevez 3 crédits pour avoir mutualisé un terminal.", bankDirection: "bank_to_player", amount: 3 },
  { id: "quality-audit", title: "Contrôle qualité", description: "Versez 1 crédit pour mettre vos dossiers à jour.", bankDirection: "player_to_bank", amount: 1 },
  { id: "research-grant", title: "Mission scientifique", description: "Recevez 4 crédits pour soutenir une mission de terrain.", bankDirection: "bank_to_player", amount: 4 },
  { id: "route-repair", title: "Route à réparer", description: "Versez 2 crédits pour restaurer un passage stratégique.", bankDirection: "player_to_bank", amount: 2 },
  { id: "local-festival", title: "Fête des savoir-faire", description: "Recevez 2 crédits grâce au rayonnement de votre collection.", bankDirection: "bank_to_player", amount: 2 }
] as const satisfies readonly TrendCard[];
