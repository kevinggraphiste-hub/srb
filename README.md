# SRB — ScarletWolf RPG Builder

> Plateforme web no-code de création et de jeu RPG 2D multijoueur.

SRB est un éditeur visuel dans le navigateur qui permet de créer des jeux RPG 2D tile-based (top-down, inspiration Zelda GB / Pokémon / RPG Maker XP), puis de les publier pour y jouer seul ou à plusieurs.

## Statut

Phase 0 — fondations. Rien n'est jouable encore.

## Stack

- **Monorepo** : pnpm workspaces + Turborepo
- **Éditeur** (`apps/editor`) : React + TypeScript + Vite + Phaser 3
- **Runtime** (`apps/player`) : Phaser 3 + TypeScript
- **Site public** (`apps/web`) : Next.js
- **API** (`apps/api`) : Fastify + Prisma
- **Game server** (`apps/gameserver`) : Node + Socket.io + Redis
- **Data** : PostgreSQL via Supabase + Supabase Storage + Redis
- **Infra** : Docker sur VPS, Nginx reverse proxy

## Structure

```
apps/       # applications déployables
packages/   # code partagé entre apps (engine, types, schemas, ui)
infra/      # Docker, Nginx, scripts de déploiement
docs/       # specs, architecture, guides
```

## Développement

Prérequis : Node 20 LTS, pnpm 10+, Docker.

```bash
pnpm install
pnpm dev
```

## Licence

MIT — voir [LICENSE](./LICENSE).
