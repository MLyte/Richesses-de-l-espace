# Déployer la partie solo statique

Cette version permet de jouer une partie complète sans serveur Node.js, Socket.IO ni PostgreSQL. Le joueur choisit son pseudo, sa couleur et son pion avant d’affronter un robot Équilibré piloté par le même moteur de décision que les robots serveur. Son nom de constellation, sa couleur et son animal sont tirés au hasard. La progression est sauvegardée automatiquement dans le navigateur.

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

## Jouer contre le robot

Depuis l’accueil, choisir **Duel contre le robot**. La partie commence immédiatement :

- le formulaire d’embarquement existant recueille le pseudo, la couleur et le pion du joueur humain ;
- le joueur humain est placé en premier et commence la partie avec 100 crédits ;
- le robot reçoit un nom parmi 20 constellations françaises, une couleur et un animal aléatoires, sans reprendre ceux du joueur ;
- il est Équilibré, connecté et prêt ;
- chaque décision passe par le moteur de règles complet ;
- le robot joue automatiquement après un délai lisible ;
- la révision de partie empêche une ancienne décision différée de s’exécuter après une pause ou une fin de partie ;
- **Rejouer contre le robot** démarre une nouvelle partie après la fin et renouvelle son identité.

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
