# Déployer le laboratoire UX statique

Cette version permet de tester l’interface avec des données de jeu réalistes sans serveur Node.js, Socket.IO ni PostgreSQL. Chaque navigateur exécute sa propre simulation locale : deux téléphones ouverts en même temps ne sont pas synchronisés.

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

Le prototype utilise une navigation avec `#` après l’ouverture d’un écran, par exemple `https://mathieuluyten.be/richesses-espace/#/play/DEMO`. C’est volontaire : cette forme fonctionne sur un hébergement statique sans règle Apache ou Nginx supplémentaire.

## Utiliser le laboratoire

Le bouton discret **Démo UX** ouvre les commandes de test :

- choisir une situation de jeu ;
- observer Orion ou Lyra ;
- réinitialiser les données ;
- revenir à l’accueil.

Les situations disponibles couvrent un tour libre, un achat, un paiement, une enchère, un échange, une pause et une fin de partie. La progression courante est enregistrée dans le stockage local du navigateur.

## Mettre à jour la version publiée

Relancer `npm.cmd run prepare:static`, puis remplacer le contenu publié par celui du nouveau dossier `dist-static`. Les fichiers JavaScript et CSS portent un nom versionné : il faut toujours envoyer le nouvel `index.html` avec les nouveaux fichiers du dossier `assets`.

## Ce que cette version ne valide pas

- la synchronisation entre appareils ;
- les reconnexions réseau ;
- la persistance d’une partie sur serveur ;
- l’autorité des commandes côté serveur ;
- le QR code multijoueur réel.

Ces fonctions resteront couvertes par la future version VPS. Le laboratoire statique sert à valider la compréhension, la lisibilité, le tactile, le responsive et l’enchaînement perçu des actions.
