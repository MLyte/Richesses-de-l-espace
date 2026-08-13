# Richesses de l’espace — plan de refonte thématique

## Statut du document

Ce document constitue la référence de conception pour transformer Orbisium en **Richesses de l’espace**.

La refonte est une transposition thématique de la jouabilité de *Richesses du Monde*, pas une nouvelle variante. Les quantités, proportions économiques, familles de cases, conditions de déclenchement et enchaînements de règles doivent rester stables. Seuls l’univers, les noms, les textes, les illustrations, les sons et la présentation sont remplacés.

Sources de référence :

- notice officielle Lansay : <https://lansay.fr/sites/default/files/2021-10/75045_NOTICE%20%281%29_0.pdf> ;
- page produit Lansay : <https://lansay.fr/en/univers/richesses-du-monde/riches-of-the-world>.

La notice confirme notamment 24 ressources, six titres par ressource, 144 titres, 13 cartes Joker, 14 cartes Actualité, deux dés, six pions et une partie de deux à six joueurs.

## Intention

Le jeu devient une aventure économique spatiale : les joueurs dirigent des consortiums qui acquièrent des concessions sur des planètes, lunes et astéroïdes, regroupent leurs parts d’exploitation par ressource cosmique et perçoivent des droits lorsque d’autres équipages visitent une case associée à cette ressource.

La jouabilité ne doit pas être réinventée. Une personne connaissant *Richesses du Monde* doit retrouver immédiatement :

- le même volume de contenu ;
- la même structure économique ;
- les mêmes familles de cases ;
- les mêmes seuils de droits ;
- les mêmes possibilités d’achat, vente, échange, enchère, alliance et faillite ;
- la même victoire par élimination des adversaires.

## Tableau de conversion général

| Richesses du Monde | Orbisium actuel | Refonte « Espace » | Quantité ou invariant |
|---|---|---|---:|
| Monde | Carte terrestre abstraite | Carte stellaire | 1 plateau |
| Continents ou familles géographiques | Continents fictifs | Secteurs stellaires | 7 |
| Pays et sous-continents producteurs | Territoires fictifs | Mondes producteurs | 28 |
| Deux niveaux géographiques | Deux niveaux géographiques | Secteurs → systèmes → mondes | Niveau système sans effet économique |
| Pays de la case | Territoire de la case | Planète, lune ou astéroïde de la case | Détermine le catalogue achetable |
| Richesse de la case | Ressource de la case | Ressource cosmique de la case | Détermine les droits à payer |
| Richesses | Ressources | Ressources cosmiques | 24 |
| Titres d’exploitation | Implantations ou concessions | Concessions orbitales | 144 |
| Titres par richesse | Titres par ressource | Concessions par ressource | 6 |
| Pourcentage mondial | Influence | Part d’exploitation galactique | Pourcentages conservés |
| Monopole | Leadership | Domination de ressource | Acquise dès 50 % |
| Royalties | Retombées ou loyers | Droits d’extraction | Seuils 30/50/70/90 % |
| Sabots par pays | Catalogues par territoire | Registres par monde | 28 catalogues |
| Banque | Réserve centrale | Banque interstellaire | Même rôle |
| Actualité | Tendance | Événement cosmique | 14 cartes |
| Cases Actualité | Cases Tendance | Balises cosmiques | 6 cases |
| Joker | Levier | Technologie d’évasion | 13 cartes |
| Cases Joker | Cases Joker | Stations technologiques | 3 cases |
| Enchères | Bourses | Marchés orbitaux | 4 cases |
| Choix continental | Comptoir régional | Portail sectoriel | 4 cases |
| Choix mondial | Mandat global | Portail galactique | 2 cases |
| 500 000 × dés | Dividende | Prime d’expédition | 8 cases |
| Douane | Contrôle | Quarantaine orbitale | 2 cases |
| Départ | Méridien ou Départ | Spatioport central | 1 case |
| Cases classiques | Territoire et ressource | Monde et ressource cosmique | 48 cases |
| Plateau complet | 78 positions | 78 positions | Cardinalité inchangée |
| Dés | Dés | Dés de navigation | 2 dés à six faces |
| Pions | Animaux Lucide | Équipages animaux Lucide | 12 choix, 6 joueurs maximum |
| Capital | Crédits | Crédits stellaires | Barème de départ inchangé |
| Faillite | Faillite | Perte de licence galactique | Élimination complète |
| Gagnant | Victoire économique | Dernier consortium actif | Éliminer tous les adversaires |

## Cardinalités obligatoires

Le contenu final doit comporter exactement :

- 1 plateau ;
- 78 positions ;
- 48 cases classiques monde + ressource ;
- 7 secteurs stellaires ;
- 28 mondes producteurs ;
- 24 ressources cosmiques ;
- 144 concessions orbitales ;
- 6 concessions par ressource ;
- 14 cartes Événement cosmique ;
- 13 cartes Technologie ;
- 2 dés à six faces ;
- 12 animaux proposés comme identité ;
- 2 à 6 joueurs dans une partie.

## Structure exacte du plateau spatial

| Case spatiale | Équivalent de référence | Nombre | Effet conservé |
|---|---|---:|---|
| Monde producteur + ressource | Pays + richesse | 48 | Achat du monde, puis droits de la ressource |
| Portail sectoriel | Choix continental | 4 | Achat jusqu’à six concessions compatibles dans le secteur |
| Portail galactique | Choix mondial | 2 | Même principe sur tout le plateau après un tour complet |
| Marché orbital | Enchères | 4 | Vente forcée après un tour complet |
| Balise cosmique | Actualité | 6 | Tirer une carte Événement cosmique |
| Prime d’expédition | 500 000 × dés | 8 | Recevoir la prime de la banque, puis régler les droits |
| Quarantaine orbitale | Douane | 2 | Perdre le prochain tour |
| Station technologique | Joker | 3 | Acheter une technologie dispensant d’une enchère |
| Spatioport central | Départ | 1 | Point de départ |
| **Total** |  | **78** |  |

L’ordre des cases peut être redistribué pour produire une identité visuelle originale et éviter de copier la disposition graphique du plateau de référence. La fréquence de chaque famille et ses règles restent cependant identiques.

## Géographie spatiale

La base privilégie de véritables objets astronomiques afin de ne pas remplacer des pays fictifs par une nouvelle collection arbitraire de noms inventés.

### Hiérarchie

```text
Secteur stellaire
└── Système planétaire
    └── Monde producteur
        └── Catalogue de concessions
```

Le niveau « système planétaire » apporte du contexte et de la cohérence, mais ne participe ni au cumul des pourcentages ni au calcul des droits.

### Proposition de 7 secteurs et 28 mondes

| Secteur stellaire | Système ou région | Quatre mondes producteurs |
|---|---|---|
| Système intérieur | Système solaire interne | Mercure, Vénus, Terre, Lune |
| Ceinture rouge | Mars et ceinture principale | Mars, Cérès, Vesta, Psyché |
| Royaumes jovien et saturnien | Systèmes de Jupiter et Saturne | Europe, Ganymède, Titan, Encelade |
| Frontière solaire | Système solaire externe | Triton, Pluton, Charon, Éris |
| Voisinage d’Orion | Étoiles proches | Proxima Centauri b, planète de Barnard, LHS 1140 b, Gliese 667 Cc |
| Corridor des exoplanètes | Systèmes TRAPPIST et TOI | TRAPPIST-1 e, TRAPPIST-1 f, TRAPPIST-1 g, TOI-700 d |
| Lointains stellaires | Systèmes Kepler et autres | Kepler-186 f, Kepler-452 b, K2-18 b, 55 Cancri e |

Les noms et rattachements astronomiques devront être vérifiés avant intégration. Une distinction claire sera faite entre données astronomiques observées, hypothèses scientifiques et éléments purement fictionnels.

### Modèle d’une concession

```ts
interface SpaceConcession {
  id: string;
  worldId: string;
  systemId: string;
  sectorId: string;
  resourceId: string;
  sharePercent: number;
  purchasePrice: number;
}
```

Le `systemId` et le `sectorId` servent à la navigation et aux Portails sectoriels. Le calcul économique principal reste fondé sur `resourceId`.

## Conversion des 24 ressources

Chaque emplacement économique original reçoit un équivalent spatial. Ses six pourcentages, ses prix et son barème restent attachés au même emplacement de données.

| Ressource de référence | Ressource spatiale | Famille visuelle |
|---|---|---|
| Aluminium | Aluminium de régolithe | Minerais stellaires |
| Blé | Cultures hydroponiques | Bioressources orbitales |
| Bois | Biofibres orbitales | Bioressources orbitales |
| Cacao | Bionutriments orbitaux | Bioressources orbitales |
| Café | Biostimulants orbitaux | Bioressources orbitales |
| Charbon | Carbone astéroïdal | Minerais stellaires |
| Cobalt | Cobalt astéroïdal | Minerais stellaires |
| Coton | Fibres biosynthétiques | Bioressources orbitales |
| Cuivre | Cuivre orbital | Minerais stellaires |
| Éolien | Courants ioniques | Énergies cosmiques |
| Fer | Fer météorique | Minerais stellaires |
| Gaz | Hélium-3 stellaire | Énergies cosmiques |
| Hydraulique | Glace cométaire | Glaces et carburants cosmiques |
| Laine | Textiles biosynthétiques | Bioressources orbitales |
| Maïs | Algues orbitales | Bioressources orbitales |
| Or | Or stellaire | Minerais stellaires |
| Pétrole | Hydrocarbures planétaires | Glaces et carburants cosmiques |
| Plomb | Plomb astéroïdal | Minerais stellaires |
| Riz | Bioprotéines orbitales | Bioressources orbitales |
| Solaire | Rayonnement stellaire | Énergies cosmiques |
| Sucre | Biosucres orbitaux | Bioressources orbitales |
| Thé | Aromates hydroponiques | Bioressources orbitales |
| Tourisme | Corridors interstellaires | Exploration galactique |
| Uranium | Isotopes fissiles cosmiques | Énergies cosmiques |

Les familles servent uniquement à organiser l’interface. Elles ne possèdent aucun indice fluctuant, ne changent pas les prix et ne produisent aucun droit collectif.

La nomenclature suit trois règles de lisibilité : chaque famille nomme une activité ou une matière identifiable, chaque ressource contient un marqueur qui suggère sa famille, et l’ensemble reste explicitement ancré dans l’exploitation spatiale, orbitale, stellaire ou galactique. Les identifiants techniques restent stables afin que ce renommage n’altère aucune règle économique.

## Règles fondamentales conservées

### Anatomie d’une case classique

Une case classique continue d’associer deux informations indépendantes :

```text
Mars · Hélium-3 stellaire
  │        │
  │        └── ressource utilisée pour calculer les droits
  └── catalogue dans lequel acheter jusqu’à six concessions
```

Le monde ne possède pas de propriétaire unique. Un joueur possède des concessions individuelles produites par différents mondes.

### Ordre d’un tour classique

1. Lancer deux dés.
2. Appliquer l’effet d’un éventuel double.
3. Déplacer le pion de la somme des dés.
4. Annoncer explicitement le monde et la ressource de la case.
5. Proposer jusqu’à six concessions encore disponibles dans le catalogue du monde.
6. Payer à la Banque interstellaire les concessions sélectionnées.
7. Recalculer les pourcentages de toutes les ressources concernées.
8. Identifier tous les autres joueurs possédant au moins 30 % de la ressource de la case.
9. Effectuer et notifier chaque paiement obligatoire.
10. Terminer explicitement le tour.

L’achat est donc résolu avant les droits. Une concession achetée pendant le tour peut faire franchir immédiatement un seuil de droits.

### Cumul des pourcentages

Les pourcentages se cumulent exclusivement par ressource, sans tenir compte de leur provenance.

Exemple :

- 15 % d’Hélium-3 stellaire sur la Lune ;
- 10 % d’Hélium-3 stellaire sur Titan ;
- 25 % d’Hélium-3 stellaire sur Proxima Centauri b ;
- total : **50 % d’Hélium-3 stellaire**.

La planète, le système et le secteur restent des informations de collection et de navigation. Ils n’altèrent pas le pourcentage total.

### Seuils de droits

Les seuils restent :

- 30 % ;
- 50 % ;
- 70 % ;
- 90 %.

Chaque ressource conserve son propre barème. Le montant applicable est celui du plus haut seuil atteint. Aucun paiement n’est dû sous 30 %.

Plusieurs bénéficiaires peuvent être payés lors d’une même arrivée. Le visiteur doit payer les autres bénéficiaires même s’il possède lui-même une partie de cette ressource.

### Capitaux de départ

| Nombre de joueurs | Capital spatial par joueur |
|---:|---:|
| 2 | 100 crédits |
| 3 | 66 crédits |
| 4 | 50 crédits |
| 5 | 40 crédits |
| 6 | 33 crédits |

L’échelle numérique est `1 crédit = 1 million` de la règle de référence.

### Doubles

Un double reste une dépense du joueur vers la Banque interstellaire, sans tour supplémentaire.

| Double | Surcharge de propulsion |
|---|---:|
| Double 1 | 1 crédit |
| Double 2 | 2 crédits |
| Double 3 | 3 crédits |
| Double 4 | 4 crédits |
| Double 5 | 5 crédits |
| Double 6 | 6 crédits |

## Cartes

### 14 Événements cosmiques

Chaque carte Actualité reçoit une contrepartie spatiale individuelle.

| Fonction économique | Nouvelle narration possible |
|---|---|
| Recevoir de la banque | Subvention de colonisation |
| Payer la banque | Maintenance orbitale |
| Recevoir d’un joueur | Contrat de ravitaillement |
| Payer un joueur | Litige de concession |
| Effet sur des titres | Incident d’extraction |
| Effet temporaire | Tempête stellaire |

Le sens du transfert, le montant, les bénéficiaires et les conditions ne doivent jamais changer pendant la réécriture. Les événements seront modélisés avec une direction bancaire explicite afin qu’un gain ne puisse pas devenir accidentellement une dépense.

Les anciens messages d’indices de marché, comme « Énergie recule », sont supprimés : ils n’appartiennent pas à la mécanique de référence.

### 13 Technologies d’évasion

Les cartes Joker deviennent des cartes Technologie. Leur fonction reste limitée à la dispense d’une mise aux enchères.

Exemples de noms thématiques :

- Propulseur d’urgence ;
- Droit de priorité orbitale ;
- Brouilleur de balise ;
- Couloir hyperspatial ;
- Licence diplomatique.

Les 13 cartes sont mécaniquement interchangeables. Une technologie est achetée sur une Station technologique, utilisée une fois, puis replacée sous son paquet.

## Cases spéciales

### Portail sectoriel

- 4 cases ;
- permet d’acheter jusqu’à six concessions dans le secteur concerné ;
- seules les ressources dont le joueur possède déjà au moins une concession sont éligibles ;
- l’effet est actif dès le début de la partie, comme le Choix continental de référence.

### Portail galactique

- 2 cases ;
- permet d’acheter jusqu’à six concessions sur l’ensemble du plateau ;
- seules les ressources déjà possédées sont éligibles ;
- devient actif après un premier tour complet du plateau.

### Marché orbital

- 4 cases ;
- devient actif après un premier tour complet ;
- le dé rouge détermine le nombre de concessions à proposer ;
- les concessions d’une même ressource sont vendues ensemble ;
- mise initiale égale à la moitié exacte du prix d’achat total ;
- surenchères autorisées ;
- en l’absence d’acheteur, reprise par la banque à la moitié du prix et remise en circulation.

### Prime d’expédition

- 8 cases ;
- la banque verse immédiatement `0,5 crédit × total des deux dés` ;
- les droits de la ressource associée sont ensuite calculés et payés aux autres joueurs.

### Quarantaine orbitale

- 2 cases ;
- le joueur perd son prochain tour ;
- l’interface doit montrer clairement la cause et la durée du blocage.

### Station technologique

- 3 cases ;
- permet d’acheter une Technologie pour 3 crédits ;
- la carte peut uniquement servir à éviter une vente forcée sur un Marché orbital ;
- une carte utilisée retourne sous le paquet.

### Partie à deux joueurs

Lorsqu’il ne reste que deux joueurs :

- les Marchés orbitaux deviennent des cases de repos ;
- les Stations technologiques deviennent des cases de repos ;
- les Technologies restantes n’ont plus de valeur.

## Transactions, échanges et alliances

| Règle de référence | Version spatiale |
|---|---|
| Vendre les titres d’une même ressource ensemble | Vendre le lot complet de concessions concerné |
| Mise initiale à la moitié du prix | Mise orbitale à 50 % |
| Surchenchères autorisées | Surcharges d’offres |
| Banque acheteuse en absence d’offre | Reprise par la Banque interstellaire |
| Transactions entre joueurs | Transferts de concessions |
| Échange de l’intégralité d’une ressource | Échange d’un portefeuille complet |
| Alliance | Consortium conjoint |
| Banque couvrant les dettes d’un joueur failli | Garantie de la Banque interstellaire |
| Titres remis en circulation | Concessions rendues aux registres |
| Dernier joueur actif gagnant | Dernier consortium opérationnel |

Un joueur menacé de faillite doit pouvoir vendre à son tour. L’interface mobile doit rendre les actions de vente, proposition, contrepartie, acceptation et refus accessibles aux moments autorisés.

## Faillite et victoire

Un joueur est déclaré en faillite lorsqu’il ne peut pas payer intégralement une dette après les transactions autorisées :

1. la Banque interstellaire couvre les dettes restantes ;
2. les concessions du joueur retournent dans les registres ;
3. son pion est retiré du plateau ;
4. les enchères de reprise sont ouvertes selon les règles prévues ;
5. le joueur est éliminé.

La partie standard ne se termine pas après un nombre arbitraire de rondes. Le gagnant est le dernier joueur ou consortium encore actif.

Les variantes rapide, conquête et chronométrée pourront être documentées séparément, mais elles ne doivent pas remplacer la règle standard.

## Direction artistique

### Intention

Le jeu abandonne l’atlas terrestre crème et devient une table de stratégie spatiale lumineuse, tactile et contemporaine. Il ne doit ressembler ni à un terminal financier, ni à une interface militaire sombre, ni à un casino futuriste.

### Conversion visuelle

| Élément actuel | Refonte spatiale |
|---|---|
| Fond ivoire | Bleu spatial profond |
| Carte de continents | Carte de systèmes et d’orbites |
| Routes terrestres | Trajectoires de navigation |
| Photos de matières | Planètes, astéroïdes et surfaces minérales |
| Cartouches continentaux | Signatures chromatiques stellaires |
| Orange d’action | Orange corail conservé |
| Vert et turquoise secondaires | Cyan énergétique |
| Panneaux blancs | Bleu nuit légèrement translucide, sans excès de verre |
| Grain papier | Poussière stellaire très légère |
| Titres éditoriaux | Titres techno-humanistes |
| Jetons animaux | Équipages animaux dans des médaillons lumineux |

### Palette

- vide spatial : `#06111F` ;
- bleu de coque : `#102A43` ;
- panneau : `#15344D` ;
- texte principal : `#F3F8FC` ;
- cyan orbital : `#35D0E2` ;
- violet cosmique : `#8067E8` ;
- corail d’action : `#F2674A` ;
- jaune stellaire : `#F6C64D` ;
- rouge danger : `#E05252`.

Le rouge est réservé aux pertes, dettes, erreurs et faillites. Aucune information essentielle ne repose uniquement sur la couleur.

### Plateau commun

- la piste de 78 cases reste collée aux quatre bords de l’écran, quel que soit son ratio ;
- la zone intérieure devient une carte stellaire ;
- les systèmes sont représentés par des orbites et les liaisons par des trajectoires ;
- les cases conservent un texte lisible à trois mètres ;
- les pions sont placés à la frontière intérieure de la piste pour ne pas masquer les libellés ;
- les regroupements de pions sont éventés et restent visibles ;
- la scène centrale présente l’événement actif, les dés, les paiements et les résultats.

### Cartes photographiques

Les cartes montrent des planètes, astéroïdes, glaces, atmosphères, surfaces minérales et infrastructures orbitales génériques.

Chaque image doit :

- être disponible localement hors ligne ;
- posséder une entrée complète dans le manifeste de licences ;
- distinguer clairement photographie scientifique et vue d’artiste ;
- éviter logos, œuvres tierces et contenus dont les droits sont ambigus ;
- être déclinée en AVIF et WebP ;
- rester lisible en format vertical mobile et en bandeau TV.

Les droits des sources spatiales devront être vérifiés individuellement. Le statut de certaines images NASA, ESA ou issues d’autres agences ne doit pas être présumé uniforme.

### Audio

La palette sonore devient matérielle et spatiale :

- tintement doux pour un achat ;
- glissement feutré pour un déplacement ;
- impulsion synthétique légère au début du tour ;
- son continu discret lorsqu’une action est attendue ;
- transfert sonore orienté lors d’un paiement ;
- souffle grave lors d’une perte ;
- accord lumineux lors du franchissement d’un seuil.

Les sons doivent respecter le réglage muet, rester courts et ne jamais bloquer la partie.

## TV, mobile et modes d’affichage

### Mode TV

- l’écran commun montre le plateau, les mouvements, les informations publiques et les événements ;
- toutes les actions restent sur les téléphones ;
- aucun bouton interactif inutile n’est affiché sur la TV ;
- l’aide et les règles restent consultables pendant les temps d’attente ;
- les textes publics importants visent au moins 20 à 24 px à 1080p ;
- les événements principaux visent 28 à 32 px ;
- les titres principaux visent 56 à 76 px.

### Mode mobile uniquement

- un téléphone crée la salle et devient l’hôte ;
- chaque joueur rejoint depuis son propre appareil ;
- le plateau public peut être consulté depuis une vue dédiée ou résumé dans chaque contrôleur ;
- le jeu doit rester jouable sans écran TV ;
- le choix du mode est effectué à la création de la salle ;
- le protocole reste compatible avec un hébergement Internet ultérieur.

### Actions mobiles

- action principale ancrée en bas, accessible au pouce ;
- paiement obligatoire visible sans débordement ;
- achats, ventes et échanges disponibles uniquement lorsqu’ils sont autorisés ;
- notifications persistantes jusqu’à lecture ou résolution ;
- retour haptique léger lorsque le navigateur le permet ;
- aucune zone critique avec défilement interne inutile.

## Mécaniques Orbisium à retirer ou neutraliser

Pour ne pas réinventer la jouabilité, les éléments suivants disparaissent comme mécaniques :

- les quatre indices de marché fluctuants ;
- les variations artificielles de secteurs ;
- les messages de type « Énergie recule » ;
- la limite automatique de douze rondes ;
- les conditions de victoire au patrimoine ;
- les primes de leadership inventées ;
- les droits calculés à partir d’un prix courant ;
- la propriété exclusive d’une case ;
- les enchères déclenchées par un simple refus d’achat.

Les familles colorées restent possibles comme classement visuel, sans modifier les règles.

## Architecture des données visée

```ts
interface SpaceRegion {
  id: string;
  name: string;
  color: string;
}

interface PlanetarySystem {
  id: string;
  regionId: string;
  name: string;
}

interface ProducingWorld {
  id: string;
  systemId: string;
  name: string;
  kind: "planet" | "moon" | "dwarf_planet" | "asteroid" | "exoplanet";
}

interface CosmicResource {
  id: string;
  name: string;
  familyId: string;
  royaltyTable: {
    30: number;
    50: number;
    70: number;
    90: number;
  };
}

interface SpaceConcession {
  id: string;
  worldId: string;
  systemId: string;
  sectorId: string;
  resourceId: string;
  sharePercent: number;
  purchasePrice: number;
}

interface WorldResourceSpace {
  id: string;
  type: "classic";
  worldId: string;
  royaltyResourceId: string;
}
```

## Ordre d’implémentation

### 1. Audit et gel des règles

- établir une matrice entre chaque donnée actuelle et son équivalent de référence ;
- identifier toute mécanique Orbisium non présente dans la règle ;
- figer les prix, pourcentages, barèmes et effets avant renommage.

### 2. Nouveau référentiel spatial

- créer les 7 secteurs, les systèmes et les 28 mondes ;
- créer les 24 ressources cosmiques ;
- vérifier les noms astronomiques ;
- maintenir des identifiants stables et explicites.

### 3. Migration des 144 concessions

- associer chaque titre existant à un monde et une ressource spatiale ;
- conserver prix, part et barème de référence ;
- garantir exactement six concessions par ressource ;
- vérifier que chaque concession est accessible depuis au moins une case classique.

### 4. Migration du plateau

- conserver les 78 positions et toutes les cardinalités ;
- convertir les 48 cases classiques en monde + ressource ;
- convertir et renommer les 29 cases spéciales ;
- préserver leurs règles et conditions d’activation.

### 5. Migration des cartes

- convertir les 14 cartes Actualité en Événements cosmiques ;
- conserver exactement direction, montant, cible et durée de chaque effet ;
- convertir les 13 Jokers en Technologies ;
- supprimer tout effet d’indice de marché ajouté par Orbisium.

### 6. Moteur et protocole

- remplacer les noms de domaine sans modifier les invariants économiques ;
- conserver le serveur comme autorité unique ;
- centraliser tous les transferts bancaires ;
- vérifier achat, droits, enchères, transactions, alliances et faillite.

### 7. Interfaces et aide

- mettre à jour tous les libellés français ;
- réécrire l’aide complète dans le thème spatial ;
- annoncer systématiquement la case, le monde, la ressource et l’effet ;
- afficher les parts cumulées par ressource ;
- garder les actions uniquement sur les téléphones en mode TV.

### 8. Direction artistique

- appliquer la nouvelle palette ;
- transformer le plateau en carte stellaire ;
- produire les cartes de ressources ;
- harmoniser Lucide, photos, animations et sons ;
- valider le rendu à 1080p, 4K et sur petits téléphones.

### 9. Validation finale

- simuler plusieurs parties complètes ;
- vérifier chaque type de case ;
- tester les seuils 29/30/49/50/69/70/89/90 % ;
- tester les flux banque → joueur et joueur → banque ;
- tester une partie jusqu’à l’élimination de tous les adversaires ;
- tester TV, mobile uniquement, réseau local et architecture de production Internet.

## Contrôles automatisés obligatoires

### Cardinalités

- `regions.length === 7` ;
- `worlds.length === 28` ;
- `resources.length === 24` ;
- `concessions.length === 144` ;
- exactement 6 concessions par ressource ;
- exactement 14 Événements ;
- exactement 13 Technologies ;
- `board.length === 78` ;
- exactement 48 cases classiques ;
- exactement 4 Portails sectoriels ;
- exactement 2 Portails galactiques ;
- exactement 4 Marchés orbitaux ;
- exactement 6 Balises cosmiques ;
- exactement 8 Primes d’expédition ;
- exactement 2 Quarantaines ;
- exactement 3 Stations technologiques ;
- exactement 1 Spatioport.

### Références

- chaque concession référence un monde et une ressource existants ;
- chaque monde référence un système existant ;
- chaque système référence un secteur existant ;
- chaque case classique référence un monde et une ressource valides ;
- chaque monde possède un catalogue accessible ;
- chaque ressource possède son barème 30/50/70/90.

### Moteur

- achat atomique de zéro à six concessions ;
- aucune concession achetée deux fois ;
- fonds suffisants vérifiés côté serveur ;
- calcul des droits après l’achat ;
- cumul par ressource uniquement ;
- plusieurs bénéficiaires possibles ;
- aucun droit sous 30 % ;
- double débité vers la banque ;
- prime d’expédition versée par la banque avant les droits ;
- faillite complète si une dette ne peut pas être réglée ;
- aucune fin automatique après douze rondes.

## Critères d’acceptation finale

- les quantités de contenu sont strictement identiques à la cible de référence ;
- aucun effet de marché supplémentaire n’existe ;
- aucun prix, pourcentage ou barème économique n’est modifié lors du renommage ;
- les pourcentages se cumulent exclusivement par ressource ;
- une arrivée classique résout toujours achat puis droits ;
- la victoire standard intervient par élimination des adversaires ;
- le jeu reste jouable de deux à six joueurs ;
- les douze animaux sont disponibles comme choix de pion ;
- le plateau spatial est lisible sur TV à trois mètres ;
- le mode mobile uniquement ne dépend pas d’un écran commun ;
- toutes les images, fontes et cartes restent accessibles hors ligne après installation ;
- les sources visuelles possèdent une entrée complète dans le manifeste de licences ;
- aucun nom, texte, illustration ou agencement graphique protégé du jeu de référence n’est repris.

## Garde-fou éditorial et juridique

La structure des règles et les cardinalités servent de référence de jouabilité. La nouvelle édition doit néanmoins conserver une expression originale :

- aucun texte de carte copié ;
- aucun visuel repris ;
- aucun logo ou habillage similaire ;
- aucune reproduction de la disposition graphique exacte du plateau ;
- aucune terminologie de marque reprise comme identité commerciale sans vérification ;
- contrôle du futur nom du jeu avant publication ;
- revue juridique avant commercialisation.

« Richesses de l’espace » reste un nom de travail tant que les recherches de disponibilité et de similarité n’ont pas été effectuées.
