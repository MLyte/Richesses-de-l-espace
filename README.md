# Richesses de l’espace

Richesses de l’espace est une aventure économique spatiale multijoueur pour 2 à 6 joueurs. Les joueurs dirigent des consortiums, acquièrent des concessions sur 28 mondes producteurs et cumulent leurs parts dans 24 ressources cosmiques. Le serveur reste l’unique autorité en mode TV comme en mode téléphones uniquement.

Le nom est un nom de travail : une recherche de disponibilité et une revue juridique restent nécessaires avant toute publication commerciale.

## Référentiel garanti

- 7 secteurs stellaires, des systèmes planétaires et 28 mondes réels ou catalogués ;
- 24 ressources cosmiques et 144 concessions, soit 6 concessions par ressource ;
- un plateau de 78 positions : 48 cases monde + ressource, 29 cases spéciales et le Spatioport central ;
- 14 Événements cosmiques, 13 Technologies, 2 dés et 12 équipages animaux ;
- aucun indice fluctuant, aucune limite de rondes et aucune victoire au patrimoine.

Les 24 ressources restent indépendantes, comme dans le jeu de référence. Les couleurs des concessions indiquent leur secteur stellaire producteur et ne créent aucune catégorie économique supplémentaire.

## Démarrage

Prérequis : Node.js 24 LTS, npm et des appareils sur le même réseau local.

```powershell
npm install
npm run dev
```

Ouvrez l’URL `Local` affichée dans le terminal. La page d’accueil propose :

- **Écran commun** : une TV ou un ordinateur affiche le plateau et le QR code ;
- **Téléphones uniquement** : le premier téléphone devient l’hôte et la partie ne dépend d’aucun écran commun.

Dans le lobby de son téléphone, l’hôte peut compléter une table avec des joueurs robots. Chaque robot occupe une des six places, reste géré par le serveur et joue selon un profil **Prudent**, **Équilibré** ou **Ambitieux**. Les profils modifient la réserve de capital et la prise de risque, sans donner accès aux Technologies privées des adversaires. Les robots répondent aux échanges ordinaires, refusent les consortiums et ne proposent pas eux-mêmes de transaction.

## Règle standard

1. Le téléphone actif lance deux dés. Un double verse à la Banque interstellaire la valeur d’un dé et ne donne aucun tour supplémentaire.
2. Le serveur déplace le pion et annonce le monde, la ressource et l’effet.
3. Sur une case classique, le monde ouvre son registre : le joueur choisit de zéro à six concessions disponibles et paie leur prix fixe à la banque.
4. Après l’achat, chaque autre joueur possédant au moins 30 % de la ressource reçoit le droit du plus haut seuil atteint : 30, 50, 70 ou 90 %. Plusieurs bénéficiaires peuvent être payés.
5. Le tour est terminé explicitement après toutes les décisions et tous les paiements.

Les parts se cumulent exclusivement par ressource, quels que soient le monde, le système et le secteur d’origine. Le capital initial vaut 100, 66, 50, 40 ou 33 crédits pour respectivement 2, 3, 4, 5 ou 6 joueurs.

Les cases spéciales sont : 4 Portails sectoriels, 2 Portails galactiques, 4 Marchés orbitaux, 6 Balises cosmiques, 8 Primes d’expédition, 2 Quarantaines et 3 Stations technologiques. Les Marchés et Stations deviennent des cases de repos lorsqu’il ne reste que deux consortiums.

Un joueur menacé par une dette peut vendre un portefeuille complet avant de déclarer faillite. Si le paiement reste impossible, la Banque interstellaire couvre le solde, les concessions retournent aux registres et le pion est retiré. Le dernier joueur ou consortium conjoint opérationnel gagne.

Deux joueurs peuvent former un consortium conjoint : chacun paie à la banque la moitié du prix d’achat cumulé de leurs concessions, les portefeuilles sont réunis et le pion du portefeuille le plus précieux devient le pion pilote.

## TV, mobile et accessibilité

En mode TV, l’écran commun affiche le plateau, les mouvements, les événements et les informations publiques ; les actions privées restent sur les téléphones. En mode mobile uniquement, chaque joueur dispose d’une navigation Jouer, Carte et Ressources : le plateau et les positions sont consultables sur tous les téléphones, tandis que l’hôte peut créer, lancer, mettre en pause, reprendre et terminer la partie depuis son appareil. Les actions obligatoires restent prioritaires, les notifications persistent jusqu’à lecture et le retour haptique est utilisé lorsqu’il est disponible.

La palette sonore Web Audio respecte le réglage muet : impulsion de tour, déplacement feutré, achat, transfert, perte et rappel discret d’une action attendue. Aucun son ne bloque la partie.

## Commandes

```powershell
npm run dev             # serveur et client en développement
npm run typecheck       # vérification TypeScript/Vue
npm test                # référentiel, moteur, médias et Socket.IO
npm run build           # client et serveur de production
npm.cmd run prepare:static  # build solo statique vérifié, prêt à envoyer
npm start               # production, après le build
npm run smoke           # vérification HTTP du build
```

### Partie solo statique

Une version sans serveur peut être publiée sous `https://mathieuluyten.be/richesses-espace/`. Le joueur choisit son pseudo, sa couleur, son pion et de **1 à 5 robots** de profil **Équilibré**. À chaque partie, leurs noms sont tirés sans doublon parmi 20 constellations françaises ; leurs couleurs et leurs animaux sont également aléatoires et uniques dans la partie :

```powershell
npm.cmd run prepare:static
```

Cette commande génère le build solo puis vérifie automatiquement ses chemins, ses médias et les fonctions attendues. Pour mettre à jour le site statique :

1. exécutez `npm.cmd run prepare:static` depuis la racine du projet ;
2. envoyez **tout le contenu** de `apps/client/dist-static` dans le dossier distant `/richesses-espace/` ;
3. vérifiez que `index.html` se trouve directement dans `/richesses-espace/`, et non dans un sous-dossier `dist-static`.

Le duel utilise le vrai moteur de règles et sauvegarde sa progression dans le navigateur. N’utilisez pas `npm run build` pour cet upload : cette commande prépare la version client-serveur multijoueur dans `apps/client/dist` et `apps/server/dist`. Le dossier `apps/client/dist` contient volontairement des chemins incompatibles avec un hébergement statique sous `/richesses-espace/`. Consultez [DEPLOIEMENT_STATIQUE.md](DEPLOIEMENT_STATIQUE.md) pour la procédure complète et les limites du mode local.

Le build de production est servi sur `http://localhost:3000/display` et écoute sur `0.0.0.0`.

Pour un hébergement Internet, placez le serveur derrière un reverse proxy HTTPS compatible WebSocket et définissez l’origine publique :

```powershell
$env:NODE_ENV="production"
$env:PUBLIC_ORIGIN="https://espace.example.com"
npm run build
npm start
```

Variables : `PORT` (3000 par défaut), `PUBLIC_PORT` et `PUBLIC_ORIGIN`. Les salles sont conservées en mémoire ; plusieurs instances nécessitent un stockage partagé et un adaptateur Socket.IO.

## Architecture et médias

- `packages/game` : référentiel spatial, moteur et tests de règles ;
- `packages/protocol` : vues et contrats partagés ;
- `apps/server` : salles, sessions et autorité Socket.IO ;
- `apps/client` : écran commun et contrôleur mobile Vue ;
- `assets/source/cards-space` : atlas et scènes PNG originales ;
- `apps/client/public/cards` : variantes AVIF/WebP hors ligne et manifeste de provenance.

Les vingt visuels de cartes sont des vues d’artiste originales générées pour ce projet, et non des photographies scientifiques. Le manifeste `assets-manifest.ts` et `/cards/space-art-provenance.json` consigne leur provenance. Le fond étoilé est la photographie « Starry sky » de Fonsi Fernández, téléchargée depuis Unsplash (`OswLA6HUFjU`) sous la licence Unsplash. Toutes les fontes, images et cartes nécessaires au jeu sont embarquées localement.
