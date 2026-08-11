# Déploiement VPS

Le jeu est prévu pour un VPS unique et le sous-domaine `jeu.mathieuluyten.be`.
Le conteneur `game` sert le client Vue, l'API et Socket.IO ; `database` conserve
les parties et les jetons de session hachés ; Caddy fournit HTTPS et le proxy WebSocket.

## Préparer le VPS

1. Installez Ubuntu LTS et Docker Compose.
2. Ajoutez un enregistrement DNS `A` : `jeu.mathieuluyten.be` vers l'adresse IPv4 du VPS.
3. Ouvrez uniquement les ports TCP 80 et 443, ainsi que SSH pour l'administration.
4. Clonez ce dépôt sur le VPS.

## Démarrer

```sh
cp .env.production.example .env.production
# Remplacer POSTGRES_PASSWORD et DATABASE_URL par le même mot de passe long.
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
```

Une fois le DNS propagé, Caddy demande automatiquement le certificat HTTPS.
La vérification de disponibilité est accessible sur `/api/health`.

## Exploitation

- Mettre à jour : `git pull && docker compose --env-file .env.production up -d --build`.
- Lire les journaux : `docker compose --env-file .env.production logs -f game`.
- Les parties inactives expirent après 168 heures par défaut ; modifiez `ROOM_TTL_HOURS` si nécessaire.
- Le volume `postgres-data` est la source de vérité : sauvegardez-le avant toute opération système majeure.

Ne versionnez jamais `.env.production`, la clé SSH privée ou le mot de passe PostgreSQL.
