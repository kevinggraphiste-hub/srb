# Architecture — Vue d'ensemble

> À compléter. Voir le plan complet dans `/home/scarletwolf/Téléchargements/goibniu-project-plan.md` section 3.

## Composants principaux

- **Éditeur** (`apps/editor`) — React + Phaser
- **Runtime de jeu** (`apps/player`) — Phaser 3
- **Site public** (`apps/web`) — Next.js
- **API REST** (`apps/api`) — Fastify
- **Game server** (`apps/gameserver`) — Socket.io
- **Packages partagés** — engine, types, schemas, ui

## Storage

- **PostgreSQL** (Supabase) — données structurées
- **Supabase Storage** — assets utilisateurs (tilesets, sprites, audio)
- **Redis** — état éphémère, pub/sub temps réel, cache
