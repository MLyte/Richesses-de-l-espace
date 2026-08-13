# Déployer la partie solo statique

Cette version permet de jouer une partie complète sans serveur Node.js, Socket.IO ni PostgreSQL. Le joueur choisit son pseudo, sa couleur, son pion et de 1 à 5 robots Équilibrés pilotés par le même moteur de décision que les robots serveur. Leurs noms de constellation, leurs couleurs et leurs animaux sont tirés au hasard sans doublon dans la partie. La progression est sauvegardée automatiquement dans le navigateur.

## Générer le dossier d’upload

Depuis la racine du projet :

```powershell
npm.cmd run prepare:static
```

Le résultat se trouve dans `apps/client/dist-static`.

> Ne publiez jamais `apps/client/dist` sur `mathieuluyten.be/richesses-espace`. Ce dossier est le build du serveur Node.js et ses ressources commencent par `/assets/`, ce qui provoque des erreurs 404 sur un sous-dossier. Les deux sorties sont volontairement séparées pour éviter qu’un build serveur écrase l’artefact statique.

## Envoyer les fichiers

1. Dans la racine web de `mathieuluyten.be`, créer le dossier `richesses-espace`.
2. Envoyer **le contenu** de `apps/client/dist-static` dans ce dossier. Le fichier `index.html` doit donc se trouver directement à l’emplacement `richesses-espace/index.html`.
3. Ouvrir `https://mathieuluyten.be/richesses-espace/` dans une fenêtre privée.
4. Tester l’accueil, le parcours mobile et l’interface TV.

L’application utilise une navigation avec `#` après l’ouverture d’un écran, par exemple `https://mathieuluyten.be/richesses-espace/#/play/SOLO`. C’est volontaire : cette forme fonctionne sur un hébergement statique sans règle Apache ou Nginx supplémentaire.

## Jouer contre les robots

Depuis l’accueil, choisir **Partie contre les robots**. L’embarquement commence immédiatement :

- le formulaire d’embarquement recueille le pseudo, la couleur, le pion du joueur humain et le nombre de robots, de 1 à 5 ;
- le joueur humain choisit l’un des sept vaisseaux régionaux et les robots choisissent automatiquement parmi ceux qui restent ;
- les sept vaisseaux disputent la course d’ouverture ; le joueur ou robot dont le choix est le mieux classé commence avec le capital prévu pour la taille de la table ;
- chaque robot reçoit un nom parmi 20 constellations françaises, une couleur et un animal aléatoires, sans doublon ni reprise de l’identité du joueur ;
- ils sont Équilibrés, connectés et prêts ;
- chaque décision passe par le moteur de règles complet ;
- chaque robot joue automatiquement après un délai lisible ;
- la révision de partie empêche une ancienne décision différée de s’exécuter après une pause ou une fin de partie ;
- **Rejouer contre les robots** démarre une nouvelle partie après la fin et renouvelle leurs identités.

Le **Pont d’observation** conserve l’écran TV validé. Dans une seconde fenêtre du même navigateur et du même profil, il suit la sauvegarde locale et rejoue les événements de la partie. Des appareils ou navigateurs distincts restent indépendants.

## Mettre à jour la version publiée

Relancer `npm.cmd run prepare:static`, puis remplacer le contenu publié par celui du nouveau dossier `dist-static`. Les fichiers JavaScript et CSS portent un nom versionné : il faut toujours envoyer le nouvel `index.html` avec les nouveaux fichiers du dossier `assets`.

## Ce que cette version ne valide pas

- la synchronisation entre appareils ou profils de navigateur distincts ;
- les reconnexions réseau ;
- la persistance d’une partie sur serveur ;
- l’autorité des commandes côté serveur ;
- le QR code multijoueur réel.

Ces fonctions restent réservées à la version serveur. Le build statique fournit en revanche une vraie partie locale jouable de bout en bout contre l’ordinateur.
