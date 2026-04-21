# CLAUDE.md — Instructions projet SRB

## Contexte

Tu travailles sur **SRB (ScarletWolf RPG Builder)**, une plateforme web no-code de création et de jeu RPG 2D multijoueur. L'utilisateur (Kevin) n'est pas développeur professionnel — tu es son principal exécutant.

Le plan de route source est dans `/home/scarletwolf/Téléchargements/goibniu-project-plan.md` (rédigé sous le nom de code "Goibniu", remplacer mentalement par "SRB").

## Stack

- **Monorepo** : pnpm workspaces + Turborepo
- **Éditeur** (`apps/editor`) : React 18 + TypeScript + Vite + Phaser 3 + Tailwind + shadcn/ui
- **Runtime** (`apps/player`) : Phaser 3 + TypeScript + Vite
- **Site public** (`apps/web`) : Next.js 14+ (App Router) + Supabase SSR
- **API** (`apps/api`) : Fastify + Prisma + Zod
- **Game server** (`apps/gameserver`) : Node + Socket.io + Redis
- **Packages partagés** : `engine` (logique moteur), `types` (types TS), `schemas` (Zod), `ui` (composants)
- **Data** : PostgreSQL via Supabase + Supabase Storage + Redis
- **Infra** : Docker sur VPS Hostinger, Nginx reverse proxy, sous-domaines `*.srb.scarletwolf.cloud`

## Principes

1. **TypeScript strict partout**. Pas de `any` sans justification écrite.
2. **Ne pas inventer** : si tu ne connais pas une API, lis la doc (WebFetch) ou demande.
3. **Petits commits atomiques** : chaque commit = une unité logique cohérente.
4. **Commits conventionnels** : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
5. **Tests** : Vitest pour logique pure, Playwright pour flows critiques.
6. **Pas de secrets en dur** : toujours via variables d'environnement.
7. **Respect du monorepo** : `packages/engine` partagé entre éditeur et runtime.

## Conventions de code

- Pas de `default export` sauf composants React, pages Next.js, configs
- PascalCase pour classes/types/composants, camelCase pour variables/fonctions
- Imports ordonnés : external → internal packages → relative
- Fichiers > 400 lignes : découper
- Pas de commentaires WHAT ("incrémente le compteur"), seulement des commentaires WHY non-évidents

## Workflow attendu par tâche

1. Lire la spec concernée dans `docs/specs/` si elle existe
2. Lister les fichiers à créer/modifier (éventuellement avec Plan mode)
3. Implémenter
4. Ajouter/mettre à jour tests
5. Lancer `pnpm typecheck && pnpm lint`
6. Commit conventionnel + push

## Règle absolue : par-utilisateur

Tout état, toute config, toute table doit être **instanciée par utilisateur** (owner_id / player_id). Jamais de singleton global qui partagerait l'état entre utilisateurs. Cette règle prime sur les autres considérations d'archi.

## Références

- Architecture : `docs/architecture/overview.md`
- Format projet : `docs/specs/project-format.md`
- Commandes d'events : `docs/specs/event-commands.md`
- API : `docs/specs/api.md`
- Plan global : `/home/scarletwolf/Téléchargements/goibniu-project-plan.md`

## Quand demander clarification

- Choix produit ambigu ("faut-il supporter X ?")
- Tradeoff perf vs complexité significatif
- Changement d'architecture
- Ajout d'une dépendance externe non standard

## Quand NE PAS demander

- Naming de variables
- Détails d'implémentation évidents
- Questions couvertes par la doc existante dans `docs/`
