# SRB — ScarletWolf RPG Builder

> Plateforme web no-code de création et de jeu RPG 2D multijoueur.

SRB est un éditeur visuel dans le navigateur qui permet de créer des jeux RPG 2D tile-based (top-down, inspiration Zelda GB / Pokémon / RPG Maker XP), puis de les publier pour y jouer seul ou à plusieurs.

## Statut actuel

**v0.2.0 — Phase 1 terminée** : runtime de jeu minimal jouable dans le navigateur.

- Écran titre (MenuScene)
- Chargement d'une map depuis un JSON
- Rendu 5 couches (background / ground / detail / objects / overlay)
- Perso animé (Ash) avec 4 directions + cycle de marche
- Collisions tile-based avec footprint configurable par personnage
- Transferts entre maps via events `contact`
- Contrôles clavier + dpad tactile sur mobile
- 2 maps de test (village extérieur 20×15, intérieur maison 10×8)

## Roadmap (résumé)

| Phase  | Cible                                              | État          |
| ------ | -------------------------------------------------- | ------------- |
| P0     | Fondations monorepo, CI, docs                      | ✅ v0.1.0     |
| **P1** | **Runtime minimal (moteur de jeu)**                | ✅ **v0.2.0** |
| P2     | Éditeur de maps (React + Phaser preview)           | À venir       |
| P3     | Events + commandes complètes (dialogues, choix...) | À venir       |
| P4     | Base de données + combats tour par tour            | À venir       |
| P5     | Backend Fastify + auth Supabase + saves cloud      | À venir       |
| P6     | Galerie de jeux publiés                            | À venir       |
| P7     | Multijoueur temps réel (Socket.io)                 | À venir       |
| P8     | Mode expert + polish                               | À venir       |

Plan complet et détaillé : voir le document de travail source (plan Goibniu v1.0).

## Stack

- **Monorepo** : pnpm workspaces + Turborepo
- **Runtime** (`apps/player`) : Phaser 4 + TypeScript + Vite 8 — **opérationnel**
- **Éditeur** (`apps/editor`) : React + Vite + Phaser preview — squelette
- **Site public** (`apps/web`) : Next.js — squelette
- **API** (`apps/api`) : Fastify + Prisma — squelette
- **Game server** (`apps/gameserver`) : Socket.io + Redis — squelette
- **Packages partagés** : `@srb/engine`, `@srb/types`, `@srb/schemas`, `@srb/ui`
- **Data** : PostgreSQL via Supabase (à venir P5) + Redis (à venir P7)

## Structure

```
apps/       # applications déployables
  editor/     React — éditeur visuel (Phase 2)
  player/     Phaser — runtime de jeu (Phase 1 ✓)
  web/        Next.js — site public (Phase 6)
  api/        Fastify — backend REST (Phase 5)
  gameserver/ Socket.io — multijoueur (Phase 7)
packages/   # code partagé entre apps
  types/      Types TS (GameMap, CharacterSheet, MapEvent...)
  engine/     Logique moteur pure (Phase 3+)
  schemas/    Validation Zod runtime (Phase 2+)
  ui/         Composants React partagés (Phase 2+)
infra/      # Docker, Nginx, déploiement (Phase 5+)
docs/       # architecture, specs, guides
```

## Développement

Prérequis : Node 20 LTS, pnpm 10+, Docker (pour Phase 5+).

```bash
pnpm install
pnpm --filter @srb/player dev       # lance le runtime sur http://localhost:5173
pnpm typecheck                       # TS strict sur tout le monorepo
pnpm lint                            # ESLint flat config
pnpm format                          # Prettier
```

### Contrôles

- **Flèches clavier** : déplacer le perso
- **Enter / clic / espace** : démarrer depuis l'écran titre
- **Tactile** : dpad virtuel affiché en bas à gauche

## Versionning

SemVer pendant la phase 0.x, chaque phase terminée ajoute 0.1.0. Détails : voir `CHANGELOG.md`.

## Licence

MIT — voir [LICENSE](./LICENSE).
