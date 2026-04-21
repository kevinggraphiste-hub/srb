# Architecture — Vue d'ensemble

Document vivant. Mis à jour à chaque changement d'archi significatif.

## État actuel (v0.2.0)

À ce stade, seul le **runtime de jeu** (`apps/player`) est implémenté. Les autres apps sont des squelettes qui compilent mais n'exposent rien.

## Diagramme global (cible à terme)

```
┌─────────────────────────────────────────────────────────────────┐
│                          NAVIGATEUR                              │
├────────────────────────┬────────────────────────────────────────┤
│  ÉDITEUR (apps/editor) │  RUNTIME (apps/player)  ← v0.2.0       │
│  React + Phaser        │  Phaser 4 + Vite        OPÉRATIONNEL   │
│  (Phase 2+)            │                                        │
└────────────────────────┴────────────────────────────────────────┘
                                  ↕ HTTPS/WSS (Phase 5+)
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (VPS)                              │
│                        (Phase 5+)                                │
├──────────────────┬──────────────────┬───────────────────────────┤
│  API (Fastify)   │  Gameserver      │  STORAGE                  │
│  /projects       │  (Socket.io)     │  - PostgreSQL/Supabase    │
│  /assets         │  (Phase 7+)      │  - Supabase Storage       │
│  /saves          │                  │  - Redis                  │
│  /gallery        │                  │                           │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Runtime `apps/player` (ce qui existe aujourd'hui)

```
main.ts
  └─ Phaser.Game config (640×480, pixel art)
       scenes registered:
         BootScene ──► MenuScene ──► LoadScene ──► PlayScene
                                         │
                                         ├─ fetch /maps/<id>.json
                                         ├─ fetch /assets/characters/<id>.json
                                         └─ Phaser.load.spritesheet(...)

PlayScene
  ├─ init(data)               # map, playerSheet, spawnTileX?, spawnTileY?
  ├─ create()                  # build world
  │    ├─ cameras bounds = map.width×height
  │    ├─ renderMapBase(this, map)          ◀── 1 Graphics, bg+ground+detail+objects
  │    ├─ new Player(this, x, y, sheet)     ◀── Sprite animé, direction facing
  │    ├─ renderMapOverlay(this, map)       ◀── 1 Graphics, above player
  │    └─ new InputProvider(this)           ◀── keyboard + touch dpad
  └─ update(time, delta)
       ├─ intent = inputs → dx, dy
       ├─ test collision X (isFeetBlocked + footprint from sheet)
       ├─ test collision Y
       ├─ apply deltas
       ├─ player.syncMovement(appliedDx, appliedDy)   ◀── anim + facing
       └─ checkContactEvents()
            └─ EventRunner.runCommands(...)
                 └─ transfer → scene.restart with new map
```

## Couches de données

### `packages/types` (source de vérité partagée)

- **`GameMap`** : structure d'une map (layers, collision, events, `defaultSpawnTile`, `parentId`, `order`, width/height variables)
- **`MapEvent` + `EventPage` + `EventCommand`** : modèle d'event façon RPG Maker avec pages conditionnelles et commandes (transfer / show_text / script / placeholder pour l'instant)
- **`CharacterSheet`** : description d'un personnage (sprite, anims, footprint de collision) — permet n'importe quelle taille/forme

### `apps/player/public`

- `/maps/*.json` — données des maps (JSON à la main pour l'instant, éditeur en Phase 2)
- `/assets/characters/<id>.png` + `<id>.json` — sprite sheet + descripteur d'anims

## Chaîne de rendu (1 frame)

1. Phaser appelle `update()` sur la scène active
2. `PlayScene.update()` :
   - Calcule l'intention de mouvement depuis `InputProvider`
   - Teste la collision axe par axe → applique les deltas autorisés
   - `player.syncMovement()` → choisit la bonne animation + direction selon le mouvement réel
   - `checkContactEvents()` → si le perso a changé de tile, lookup event, déclenche les commandes
3. Phaser déclenche son cycle de rendu interne :
   - `renderMapBase` Graphics (bg → ground → detail → objects)
   - Le `player.sprite` (Phaser.Sprite)
   - `renderMapOverlay` Graphics (overlay — roof/canopy au-dessus du perso)

## Décisions d'architecture

Chaque décision significative est documentée en ADR dans `docs/architecture/decisions/`.

À venir : ADR 0001 sur le choix monorepo pnpm + Turborepo, ADR 0002 sur le format de map 5 couches vs 3, ADR 0003 sur CharacterSheet JSON vs format RPG Maker XP rigide.
