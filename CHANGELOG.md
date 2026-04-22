# Changelog

Toutes les modifications notables de SRB sont listées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et le projet suit [Semantic Versioning](https://semver.org/lang/fr/).

## [0.4.2] — 2026-04-22 — Events accessibles : templates, mode simple, vocabulaire FR

L'éditeur d'events passe de « RPG Maker nu » à quelque chose d'utilisable
sans connaître le vocabulaire technique. Runtime inchangé — le modèle de
données reste celui du draft 1.0.0 de la spec.

### Added

- **Templates d'events** : cliquer sur une tile vide avec l'outil V ouvre
  une fenêtre de choix avec 5 modèles pré-remplis :
  - 🧙 PNJ qui parle — page action + un dialogue d'exemple
  - 📜 Panneau d'info — invisible, texte d'accueil
  - 🌀 Téléporteur — invisible, déclenché au contact, transfer à configurer
  - 🚪 Porte / passage — interactif, transfer à configurer
  - ⬜ Vide — aucun défaut (ancien comportement)
- **Mode Simple / Avancé** (toggle en haut du panneau, persisté dans
  localStorage) :
  - Simple : masque conditions, déplacement, direction/frame de sprite,
    et la commande script. C'est le défaut.
  - Avancé : toutes les options RPG-Maker, comme en v0.4.1.
- **Sélecteurs visuels** :
  - Direction → boutons ← ↑ ↓ → au lieu d'un dropdown texte
  - Commande « Téléporter le joueur » → dropdown des maps du projet
    (plus de mapId à taper à la main)
- **Preview inline dans la liste d'actions** : la première ligne d'un
  dialogue, le nom de la map cible d'un transfer, s'affichent dans le
  header de la commande pour repérer visuellement.

### Changed

- **Vocabulaire FR** du panneau Event. Plus de `trigger` / `page` /
  `graphic` / `movement` / noms techniques de commande dans l'UI :
  - « Quand ça se déclenche » (options : « Le joueur interagit »,
    « Le joueur marche dessus », « Automatique (1 fois) », « En boucle
    de fond »)
  - « Variantes » au lieu de « Pages »
  - « Apparence », « Déplacement (entre interactions) », « Actions (à
    l'activation) »
  - « Dire un texte », « Téléporter le joueur », « Code (expert) »,
    « Slot vide » pour les 4 commandes runtime actuelles.
- Aide du panneau Event précise maintenant le comportement du picker de
  templates.

## [0.4.1] — 2026-04-22 — Fixes UX panneau Event + raccourcis

### Fixed

- **Panneau Event masqué après création d'un event** : les workspaces
  sauvegardés en v0.3 n'avaient pas le panel "event", et même dans le
  layout par défaut il pouvait rester derrière l'onglet Aide. Désormais
  le panel est injecté à l'ouverture s'il manque, et il est auto-activé
  dès qu'un event est créé ou sélectionné via l'outil V.
- **Shift+drag en rect inopérant** : la détection via listener global
  keydown pouvait rater (focus absorbé par un input / dockview). Lu
  maintenant directement sur `pointer.event.shiftKey` au moment du
  pointerdown — fiable quel que soit le focus.
- **Ctrl+Z qui ne défait pas les dessins après avoir tapé dans un
  champ event** : cliquer sur le canvas ne relâchait pas le focus de
  l'input, donc Ctrl+Z faisait l'undo natif du champ au lieu de notre
  history. Le pointerdown canvas blur maintenant l'élément focusé.
- **Chaque frappe dans un champ event = un entry d'undo** : les
  inputs/textareas du panneau Event sont groupés en un seul stroke
  (beginStroke au focus, commitStroke au blur). Un rename ou une
  saisie de dialogue = un seul Ctrl+Z pour tout annuler.

## [0.4.0] — 2026-04-22 — Phase 3 step 1 : placement & édition d'events

Premier palier de la Phase 3 « Événements ». L'éditeur permet maintenant de
poser des events sur la map et d'en éditer la structure (pages, conditions,
mouvement, apparence, liste de commandes). Le set de commandes éditables
reste celui déjà supporté au runtime en v0.3 (`show_text`, `transfer`,
`script`, `placeholder`) — les ~25 commandes supplémentaires prévues par la
spec arrivent en v0.5 → v0.9.

### Added

- **Spec `docs/specs/event-commands.md`** (draft 1.0.0) : catalogue complet
  des commandes prévues en P3, sémantique runtime, stores switches/variables,
  règles de compatibilité. Vit tout au long de P3.
- **Outil Event (`V`)** dans la palette d'outils :
  - clic sur une tile vide → crée un event et le sélectionne
  - clic sur un event existant → le sélectionne
  - affichage automatique des markers d'events sur le canvas quand l'outil
    est actif (lettre du trigger : A/C/A/P, couleur par trigger)
- **Panneau « Event »** (stacké avec Aide, à droite) :
  - renommage inline + suppression (avec confirmation)
  - onglets de pages (ajouter / dupliquer / supprimer)
  - par page : trigger, pattern de mouvement, apparence (spriteId, direction,
    frame), conditions (switch / variable / self\_switch / item\_owned),
    liste éditable de commandes
- **Éditeur de commandes** : ajout, suppression, réordonnancement (↑ / ↓),
  édition inline des paramètres pour les 4 types existants.
- Raccourci `V` pour basculer sur l'outil Event, listé dans le panneau Aide.

### Changed

- `EditorScene` : nouveau container « events » rendu au-dessus de la map,
  avec highlight de l'event sélectionné. Toggle `showEvents` + setter
  `setSelectedEventId` exposés.
- `EditorContext` : expose `selectedEventId`, `setSelectedEventId`,
  `onEventChange`, `onEventDelete`, `onEventToolClick`.
- Layout par défaut dockview : ajoute le panneau Event (stacké avec l'Aide
  dans la colonne de droite). Les workspaces existants au format v2 ne sont
  pas invalidés — le panneau apparaît au prochain reset au défaut.
- Tous packages bumpés à 0.4.0.

## [0.3.0] — 2026-04-22 — Phase 2 « Éditeur de maps » complète

Tout ce qui manquait à l'éditeur pour être autonome : nouveaux outils
de peinture, édition de la collision, undo/redo, persistance du projet
et aperçu en direct du jeu dans l'éditeur.

### Added

- **Visibilité par couche** : chaque layer (background / ground / detail / objects / overlay) a un toggle œil dans le panneau Couche. Indépendant de la couche active.
- **Overlay collision** : bouton dédié dans le panneau Visibilité — affiche un voile rouge sur les tiles bloquantes, quelle que soit la couche en cours d'édition.
- **Outils de peinture étendus** :
  - **Rect (R)** : glisse pour remplir un rectangle de la tile sélectionnée (preview vivant pendant le drag)
  - **Fill (F)** : flood-fill 4-connexe de toutes les tiles adjacentes de même ID
- **Édition collision** : nouvelle couche `Collision` dans le sélecteur — les outils Stamp/Eraser/Rect/Fill basculent alors le grid booléen (stamp = bloquant, eraser = passable).
- **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z, Ctrl+Y aussi accepté) :
  - Un drag de 50 tiles = **un seul** entry d'undo (détection de stroke via pointerdown/up)
  - Les opérations one-shot (rename, delete, move, new map) s'auto-commit
  - Historique capé à 100 entrées
  - Boutons ↶ / ↷ dans le header
- **Persistance de projet** :
  - Auto-save dans localStorage 1.5 s après chaque changement, restauré au prochain boot
  - Menu `Projet ▾` : renommer, exporter en JSON, importer un JSON, nouveau projet (wipe autosave)
- **Aperçu en direct** :
  - Bouton `▶ Tester` (Ctrl+P) ouvre le player dans une iframe modale
  - Le projet entier est transmis via `postMessage` après handshake
  - Les `transfer` d'events résolvent les maps depuis le projet (plus besoin d'écrire des fichiers JSON pour tester)
  - URL du player configurable via `VITE_PLAYER_URL`

### Changed

- `EditorScene` émet des events pointer bruts (down/drag/up) ; toute la logique d'outil vit côté React maintenant — plus simple d'ajouter un nouvel outil sans toucher Phaser.
- `loadMap()` du player est preview-aware : cherche d'abord dans le projet en mémoire, retombe sur `/maps/<id>.json` sinon.
- Tous les packages bumpés à 0.3.0 pour marquer la fin de la Phase 2.

## [0.2.4] — 2026-04-22 — Éditeur : vrai docking (dockview) + défaut custom

### Changed

- **Migration vers `dockview-react`** pour le layout de l'éditeur. Les panels sont maintenant de vrais onglets :
  - glisser un onglet pour le **réorganiser**, le **stacker** sur un autre, ou le **détacher** en split vertical/horizontal
  - chaque groupe peut être **minimisé** / **reposition** à la volée
  - le layout complet est sérialisé (JSON `SerializedDockview`) et persisté dans localStorage
- `components/ResizeHandle.tsx` supprimé — remplacé par le splitter natif de dockview
- State partagé entre panels via `EditorContext` (plus de prop-drilling dans `App.tsx`)

### Added

- Menu `Workspace ▾` : **★ Définir comme défaut** — sauvegarde la config courante comme layout de référence. Le bouton `Reset au layout par défaut` retombe alors sur cette config au lieu du hardcoded.
- `Restaurer le défaut d'origine` — efface le défaut custom si tu veux revenir au layout du jour 1.
- Accent visuel rouge SRB sur les onglets actifs / drop zones dockview.

### Migration

- Clé localStorage : `srb-editor:workspace-v1` (anciens sliders) → `srb-editor:workspace-v2` (dockview JSON). Les anciens workspaces sauvegardés sont ignorés (format incompatible).

## [0.2.3] — 2026-04-21 — Éditeur : panneaux resizables + workspaces

### Added

- **Panneaux redimensionnables** : glisse les séparateurs verticaux pour ajuster la largeur de la palette (gauche) et du panneau projet (droite). Canvas prend le reste. Min 160px, max 500px.
- **Persistance localStorage** : le layout courant est sauvegardé automatiquement à chaque changement. Tu le retrouves au prochain refresh.
- **Workspaces nommés** : menu `Workspace ▾` dans le header pour :
  - Sauver la config actuelle sous un nom ("Édition", "Preview", ...)
  - Basculer entre plusieurs presets
  - Supprimer un preset
  - Reset au layout par défaut
- Bouton ⇡ (v0.2.2 patch) pour détacher un item à la racine + drop sur la toolbar avec feedback visuel

## [0.2.2] — 2026-04-21 — Éditeur : project + tree + map edit

Début de l'éditeur de maps (`apps/editor`) jouable en parallèle du player.

### Added

- **Éditeur React + Vite + Phaser** sur http://localhost:5174 (port 5174 pour coexister avec le player sur 5173)
- Palette de tiles partagée avec le player (tile-registry migré dans `@srb/engine`)
- Outils **Stamp** et **Eraser**, raccourcis **B** / **E**, hover coloré (rouge stamp, gris eraser)
- Sélection de la couche active : ground / detail / objects
- Peinture en clic simple ou drag
- **Project** : un projet contient plusieurs maps + dossiers, arborescence façon RPG Maker (voir `@srb/types` : `Project`, `ProjectItem`, `ProjectFolderItem`)
- **ProjectTree** dans le panneau droit avec :
  - Double-clic pour **renommer** en place
  - Bouton ⚙ sur une map pour **modifier taille + nom** (resize crop/pad propre des layers + events)
  - Bouton ✕ pour **supprimer** (cascade sur les enfants, confirmation)
  - **Drag & drop** pour déplacer un item sous un autre item (map ou dossier) ou à la racine
  - Boutons +M / +F sur les dossiers pour ajouter map / sous-dossier à l'intérieur
- Modal **Nouvelle map** avec nom + dimensions custom (1–200 tiles chaque)
- Filiation **map → map** supportée (une maison peut avoir ses pièces en enfants directs, sans passer par un dossier)

### Changed

- `packages/engine` exporte maintenant la `TILE_REGISTRY` partagée
- `apps/player` importe tile-registry depuis `@srb/engine` (au lieu de son propre fichier local)

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
