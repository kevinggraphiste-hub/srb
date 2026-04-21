# Changelog

Toutes les modifications notables de SRB sont listées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et le projet suit [Semantic Versioning](https://semver.org/lang/fr/).

## [0.2.1] — 2026-04-21 — NPC + dialogues

Extension du runtime avec les briques qu'il manquait pour faire vivre une map.

### Added

- **Trigger `action`** — appuyer sur Espace (ou bouton A tactile) déclenche l'event sur la tile en face du joueur, selon sa direction courante
- **Commande `show_text`** vraiment fonctionnelle via une nouvelle `DialogBox` (overlay bas d'écran, fermeture à Espace)
- **Exécution séquentielle des commandes** : un event peut enchaîner plusieurs `show_text` avant un éventuel `transfer`
- **NPCs sur la map** : chaque event avec `graphic.spriteId` non-null apparaît comme un sprite au monde, charge sa `CharacterSheet` et ses animations
- **`CharacterSheet.tint`** optionnel — permet de palette-swap un sprite existant pour un NPC placeholder
- **Y-sorting** : la profondeur du joueur et des NPCs suit leur feet-y, donc passer au-dessus d'un perso le fait apparaître devant vous naturellement (plus de "marche sur la tête")
- **Bouton A** sur le dpad tactile pour les interactions

### Changed

- `collision.isFeetBlocked` prend maintenant une `CollisionGrid` + dimensions au lieu d'un `GameMap` — le site d'appel peut mélanger collision statique et tiles dynamiques (NPCs, objets bloquants)
- `EventRunner` ne contient plus `runCommands` — la logique séquentielle est dans `PlayScene` parce qu'elle doit mettre en pause l'update loop pendant les dialogues
- `LoadScene` scanne les events de la map pour charger automatiquement les `CharacterSheet` et spritesheets dont elle a besoin

### Content

- Le village a maintenant un **villageois** (placeholder Ash teinté bleu) en bas-gauche avec un dialogue en 3 messages — dit "Bienvenue à SRB" et renvoie vers la maison du maire

## [0.2.0] — 2026-04-21 — Phase 1 « Runtime minimal »

Premier runtime de jeu jouable dans le navigateur.

### Added

- **Scene manager** complet : `BootScene` → `MenuScene` → `LoadScene` → `PlayScene`
- **Écran titre** avec version affichée et transition Enter / clic / espace
- **Format Map** dans `@srb/types` : 5 couches de rendu (background, ground, detail, objects, overlay) + collision logique + events + filiation parent/enfant + dimensions par map + spawn par défaut
- **Chargement d'une map** depuis un JSON (`/maps/<id>.json`)
- **Rendu tile-based** optimisé via `Phaser.Graphics` (2 draw calls pour la map entière)
- **Format CharacterSheet** dans `@srb/types` : sprite, dimensions, footprint de collision et animations déclarés en JSON — permet des persos de toute taille (boss, nain, animal...) avec le même code
- **Sprite Ash** animé (4 directions, cycle de marche 8 fps, convention RPG Maker XP 32×48)
- **Collisions tile-based** avec footprint étroit aux pieds + glissement le long des murs
- **EventRunner** minimal : détection de contact, sélection de page, exécution séquentielle de commandes
- **Commande `transfer`** — changement de map avec spawn à une tile précise, sans ping-pong à l'arrivée
- **InputProvider unifié** : flèches clavier + dpad tactile virtuel auto-détecté sur mobile
- **2 maps de démo** : village extérieur 20×15 avec maison, intérieur 10×8 avec porte retour

### Fixed

- Perf de rendu (–370 draw calls → 2) par regroupement des tiles dans un `Graphics`
- Suivi caméra instantané (suppression du lerp à 0.15 qui donnait une impression de lourdeur)
- Prettier ne massacre plus les grilles JSON des maps (entrée `maps/*.json` dans `.prettierignore`)

## [0.1.0] — 2026-04-21 — Phase 0 « Fondations »

Squelette du projet, avant tout code de jeu.

### Added

- Monorepo pnpm + Turborepo
- Configs partagées TS strict + ESLint flat + Prettier + EditorConfig
- Workflow GitHub Actions (format + lint + typecheck)
- Squelettes de 5 apps (`editor`, `player`, `web`, `api`, `gameserver`)
- Squelettes de 4 packages (`@srb/engine`, `@srb/types`, `@srb/schemas`, `@srb/ui`)
- Arborescence `docs/` avec placeholders (architecture, specs, claude-code, user-guide)
- `CLAUDE.md` avec instructions projet et conventions
- Licence MIT
