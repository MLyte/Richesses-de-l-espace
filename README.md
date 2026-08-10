# Orbisium

Orbisium est un jeu économique multijoueur pour 2 à 6 joueurs. Une partie peut utiliser une TV ou un ordinateur comme écran commun, ou fonctionner uniquement sur les téléphones. Le serveur reste l’unique autorité dans les deux modes.

Le monde fictif étendu possède 7 continents éditoriaux, 28 territoires producteurs, 24 ressources et 144 titres d’exploitation. Chaque ressource comprend exactement six titres totalisant 100 %, répartis dans six territoires et six continents. Le parcours compte 78 positions : 48 cases classiques pays–ressource, 29 emplacements spéciaux et le Méridien de départ.

## Prérequis

- Node.js 24 LTS ;
- npm ;
- des téléphones connectés au même réseau local ;
- facultativement, une TV ou un ordinateur pour l’écran commun.

## Démarrage rapide

```powershell
npm install
npm run dev
```

Ouvrez l’URL `Local` affichée dans le terminal. La page d’accueil propose deux installations :

- **Écran commun** : la TV ou l’ordinateur montre la carte et un QR code ;
- **Téléphones uniquement** : le premier téléphone devient l’hôte, partage le lien, lance la partie et conserve les commandes pause, reprise, fin et nouvelle partie.

Si Windows demande l’autorisation du pare-feu, autorisez Node.js sur les réseaux privés. Si plusieurs interfaces réseau sont détectées, les différentes URL sont présentées sous le QR code.

## Déroulement du MVP

1. L’hôte choisit le mode de table et crée la partie.
2. Deux à six joueurs scannent le QR code, choisissent un prénom, une couleur et un symbole de pion, puis se déclarent prêts.
3. L’écran commun ouvre les marchés.
4. Le téléphone actif lance deux dés.
5. Le serveur déplace le pion sur une case associant toujours un pays producteur et une ressource.
6. Le joueur choisit de zéro à six titres encore disponibles du pays, puis règle successivement tous les détenteurs possédant au moins 30 % de la ressource de la case.
7. Les cases spéciales révèlent une Tendance, proposent un Joker payant ou déclenchent une vente forcée après le premier tour complet.
8. Avant ou après son déplacement, le joueur actif peut proposer un échange bilatéral.
9. La partie continue sans limite automatique de rondes ; elle se termine sur décision de l’hôte ou lorsqu’il ne reste qu’un joueur solvable.

Chaque arrivée affiche obligatoirement une fiche de résolution sur l’écran commun et les téléphones : nom de la case, catégorie, effet produit et action éventuelle. Une case sans action indique explicitement « Aucun effet » avant que le joueur puisse terminer son tour.

Une case classique n’appartient à personne. Sa moitié « pays » ouvre le catalogue des titres produits dans ce pays ; sa moitié « ressource » déclenche ensuite les royalties. Chaque titre possède un pays, une ressource, une part mondiale et un prix fixe. Les parts d’une même ressource se cumulent entre tous les pays. Chaque autre joueur atteignant 30 %, 50 %, 70 % ou 90 % reçoit le montant fixe du plus haut seuil atteint. Plusieurs bénéficiaires peuvent donc être payés après une seule arrivée.

Le capital initial dépend du nombre de joueurs : 100 crédits à deux, 66 à trois, 50 à quatre, 40 à cinq et 33 à six. Un double verse à la banque autant de crédits que la valeur d’un dé et n’accorde aucun tour supplémentaire.

En cas de dette impossible à régler, le joueur déclare faillite. La banque indemnise les créanciers, reprend les titres puis les propose aux autres joueurs. Le joueur devient spectateur et le dernier joueur solvable gagne immédiatement.

Quatre cases Bourse déclenchent les appels d’offres après le premier tour complet. Le dé rouge impose au joueur arrivé le nombre de ses propres implantations à vendre. Il compose les lots, dont le prix initial vaut la moitié du prix d’achat. Les autres joueurs disposent de dix secondes après chaque offre pour surenchérir ; le prix final revient au vendeur. Sans enchérisseur, la banque reprend le lot à moitié prix. À deux joueurs, ces cases deviennent des cases de repos. Les échanges permettent au joueur actif de proposer à un autre joueur une combinaison d’implantation et de crédits ; le transfert n’a lieu qu’après acceptation explicite.

Les cartes Actualité versent ou prélèvent un montant explicite depuis ou vers la banque. Sur la case Joker, le joueur peut acheter pour 3 crédits une exemption à usage unique, utilisable uniquement avant la sélection d’une vente forcée.

L’écran commun regroupe les possessions de chaque joueur par filière, utilise toute la surface du téléviseur et propose un mode plein écran. Le bouton « Aide » rappelle la boucle de jeu, le calcul des retombées et les limites du prototype.

Les dés, prix, soldes, positions et propriétaires sont exclusivement calculés par le serveur. Une actualisation du navigateur réassocie automatiquement le téléphone à son joueur. Si le joueur actif se déconnecte — ou si le tour d’un joueur déjà hors ligne arrive — la partie est mise en pause avec une explication visible sur tous les écrans.

Une identité sonore douce est générée localement avec Web Audio : taps feutrés, tintements chauds et transitions aériennes. Le joueur actif entend le début de son tour, puis un rappel ambiant très léger tant qu’une action obligatoire reste à effectuer. Le bouton haut-parleur permet de tout couper sur chaque appareil.

## Commandes

```powershell
npm run dev             # serveur et client en développement
npm run typecheck       # vérification TypeScript/Vue
npm test                # moteur et parcours Socket.IO multiclient
npm run build           # client et serveur de production
npm start               # production, après le build
npm run smoke           # démarre brièvement le build et vérifie HTTP
npm run assets:optimize # recrée les variantes AVIF/WebP
```

Le build de production est servi sur `http://localhost:3000/display` et écoute sur `0.0.0.0`.

## Utilisation sur Internet

Le même build fonctionne sur Internet sans changer le protocole : Express sert le client et Socket.IO sur une origine HTTPS unique. Configurez l’URL publique avant de lancer le serveur :

```powershell
$env:NODE_ENV="production"
$env:PUBLIC_ORIGIN="https://orbisium.example.com"
npm run build
npm start
```

`PUBLIC_ORIGIN` place d’abord l’adresse Internet correcte dans les invitations, tout en conservant les adresses LAN disponibles. En production, placez le processus Node derrière un reverse proxy HTTPS qui transmet les connexions WebSocket. Une seule instance Node suffit pour cette version en mémoire. Plusieurs instances nécessiteraient un stockage de salles partagé, l’adaptateur Socket.IO correspondant et des sessions affines ; ce n’est pas activé implicitement.

Variables disponibles :

- `PORT` : port d’écoute du serveur, `3000` par défaut en production ;
- `PUBLIC_PORT` : port annoncé pour les URL LAN ;
- `PUBLIC_ORIGIN` : origine HTTPS publique sans chemin final.

## Architecture

- `packages/game` : données originales et moteur pur ;
- `packages/protocol` : vues et contrats partagés ;
- `apps/server` : salles en mémoire, sessions et Socket.IO ;
- `apps/client` : écran commun Vue et contrôleur mobile ;
- `assets/source/cards` : photographies sources ;
- `apps/client/public/cards` : variantes locales optimisées.

Il n’y a ni compte ni base de données. Toute partie est perdue au redémarrage du serveur, qu’il soit hébergé sur le réseau local ou sur Internet.

## Photographies et identité

Les vingt photographies éditoriales proviennent d’Unsplash et servent de familles visuelles aux 144 titres. Les auteurs, liens sources et dates de téléchargement sont consignés dans `assets-manifest.ts` et visibles dans la page `/credits`. Les images sont embarquées localement : une partie ne dépend pas d’Internet.

Orbisium, ses hubs, ses implantations, son parcours et ses règles de marché ont été créés pour ce projet. Le nom demeure provisoire et devra faire l’objet d’une recherche de marque avant publication.
