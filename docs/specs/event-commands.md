# Event Commands — Spec

Format des événements (`MapEvent`) et catalogue des commandes (`EventCommand`)
exécutées par le runtime quand une page d'event se déclenche.

Version : **1.2.0-draft** (vit pendant toute la Phase 3 ; figée à la fin de P3)

---

## 1. Modèle (source : `packages/types/src/map.ts`)

### 1.1 `MapEvent`

Un event est ancré sur une tile et contient une ou plusieurs **pages**.
Plusieurs events peuvent partager la même tile.

```ts
interface MapEvent {
  id: string;        // unique dans la map
  name: string;      // libellé humain (éditeur)
  x: number;         // tile x
  y: number;         // tile y
  pages: EventPage[];
}
```

### 1.2 `EventPage`

Les pages sont évaluées **de haut en bas** au moment où l'event pourrait se
déclencher. La **première page dont toutes les conditions sont vraies** devient
active. Si aucune page ne matche, l'event est inerte sur ce tick.

```ts
interface EventPage {
  conditions: EventCondition[];   // [] = toujours active
  trigger: EventTrigger;
  graphic: {
    spriteId: string | null;      // null = invisible
    direction: 'up' | 'down' | 'left' | 'right';
    frame: number;
  };
  movement: MovementPattern;
  commands: EventCommand[];
}
```

### 1.3 `EventTrigger`

| Trigger    | Déclenchement                                            |
| ---------- | -------------------------------------------------------- |
| `action`   | Joueur appuie sur la touche d'action face à l'event      |
| `contact`  | Joueur entre sur la tile de l'event (ou event sur joueur) |
| `auto`     | Dès que la page devient active (une fois)                |
| `parallel` | En continu tant que la page est active                   |

### 1.4 `EventCondition`

```ts
type EventCondition =
  | { type: 'switch'; id: string; value: boolean }
  | { type: 'variable'; id: string; op: '=' | '>=' | '<=' | '>' | '<'; value: number }
  | { type: 'self_switch'; id: 'A' | 'B' | 'C' | 'D'; value: boolean }
  | { type: 'item_owned'; itemId: string };
```

- `switch` / `variable` : état global du projet (table `switches` / `variables`).
- `self_switch` : état local à cet event, id `A`–`D`.
- `item_owned` : dépend du système d'inventaire (Phase 4+ ; no-op tant que
  l'inventaire n'existe pas).

### 1.5 `MovementPattern`

```ts
type MovementPattern =
  | { type: 'fixed' }
  | { type: 'random' }
  | { type: 'approach' }
  | { type: 'custom'; route: MovementStep[] };
```

Active **entre les exécutions** de commandes, si `graphic.spriteId !== null`.
Respecte la collision. Le joueur n'est jamais traversé.

---

## 2. Catalogue des commandes

Chaque entrée : **statut**, **forme TS**, **sémantique runtime**, **éditeur**.

Statuts :

- ✅ **v0.3.x** — déjà typé et exécuté au runtime
- 🛠 **P3** — prévue, livrée dans la tranche v0.4–v0.9
- 🔜 **P4+** — sémantique dépend d'un système livré plus tard (combat, inventaire)

### 2.1 Livrées en v0.3.x

| Cmd         | Statut | Forme                                                   |
| ----------- | ------ | ------------------------------------------------------- |
| show_text   | ✅     | `{ type: 'show_text'; text: string; speaker?: string }` (speaker ajouté en v0.5) |
| transfer    | ✅     | `{ type: 'transfer'; mapId: string; x: number; y: number }` |
| script      | ✅     | `{ type: 'script'; code: string }` (mode expert)        |
| placeholder | ✅     | `{ type: 'placeholder' }` (slot vide pour l'éditeur)    |

**Livrées en v0.5.x :**

| Cmd          | Statut | Forme                                                                                                                                 |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| show_choices | ✅     | `{ type: 'show_choices'; prompt: string; choices: Array<{ label: string; branch: EventCommand[] }>; defaultIndex?: number; cancelIndex?: number }` |

**Livrées en v0.6.x :**

| Cmd              | Statut | Forme                                                                                  |
| ---------------- | ------ | -------------------------------------------------------------------------------------- |
| set_switch       | ✅     | `{ type: 'set_switch'; id: string; value: boolean }`                                   |
| toggle_switch    | ✅     | `{ type: 'toggle_switch'; id: string }`                                                |
| set_variable     | ✅     | `{ type: 'set_variable'; id: string; op: '='\|'+='\|'-='\|'*='\|'/='; value: number \| { ref: string } }` |
| set_self_switch  | ✅     | `{ type: 'set_self_switch'; id: 'A'\|'B'\|'C'\|'D'; value: boolean }`                  |
| conditional      | ✅     | `{ type: 'conditional'; cond: EventCondition; then: EventCommand[]; else?: EventCommand[] }` |

**Sémantique actuelle :**

- `show_text` : ouvre une DialogBox, bloque l'EventRunner jusqu'à la touche d'action. Si `speaker` est fourni, un bandeau avec le nom est rendu au-dessus de la boîte.
- `show_choices` : ouvre la DialogBox en mode choix : `prompt` en haut, liste verticale de `choices`. Le joueur navigue avec ↑ ↓, confirme avec Espace, annule avec Échap (fallback sur `cancelIndex` si défini, sinon l'Escape est ignoré). La `branch` du choix retenu est **unshifted** dans la queue — elle s'exécute avant les commandes qui suivent le `show_choices`.
- `transfer` : restart de PlayScene sur la map cible avec le spawn fourni.
- `set_switch` / `toggle_switch` : écrit dans le `SwitchStore` partagé (par-user, persisté à travers les transferts via `Phaser.game.registry`).
- `set_variable` : lit puis écrit dans le `VariableStore`. La RHS est soit un littéral entier, soit `{ ref }` (valeur d'une autre variable). Division par zéro = no-op.
- `set_self_switch` : écrit dans le `SelfSwitchStore` sous `${mapId}:${eventId}:${slot}`. La commande doit être exécutée dans le contexte d'un event (`currentEventId` non-null).
- `conditional` : évalue `cond` contre les stores. Si vraie, unshift `then` ; sinon unshift `else` (vide si absent). Pas de boucle, ré-entrée gratuite (then/else sont eux-mêmes des `EventCommand[]`).
- `script` : `new Function('ctx', code)(ctx)`. Sandbox réelle en Phase 8.
- `placeholder` : no-op, laissé dans la liste comme emplacement éditeur.

**Évaluation des pages au runtime :** depuis v0.6, `getActivePage(event, stores, mapId)` itère les pages top-down et retourne la première dont **toutes** les conditions matchent (AND logic). Une page sans condition est toujours active (fallback en queue de liste). `item_owned` retourne `true` (no-op) tant que l'inventaire n'est pas livré (P4+).

### 2.2 Cibles P3 (à livrer dans v0.4 → v0.9)

Regroupées par sous-système. Chaque ligne devient un type à ajouter à l'union
`EventCommand` au moment de l'implémentation.

#### Dialogue & choix

| Cmd              | Statut | Forme                                                                                     |
| ---------------- | ------ | ----------------------------------------------------------------------------------------- |
| show_text (v2)   | partiel (speaker ✅ v0.5 · face 🛠 v0.8) | `speaker?: string`, plus tard `face?: { spriteId: string; frame: number }` |
| show_choices     | ✅ v0.5 | `{ type: 'show_choices'; prompt: string; choices: Array<{ label: string; branch: EventCommand[] }>; defaultIndex?: number; cancelIndex?: number }` |
| input_number     | 🛠 | `{ type: 'input_number'; variableId: string; digits: number }`                            |

#### Contrôle de flow

| Cmd               | Forme                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- |
| conditional       | ✅ v0.6 — voir 2.1                                                                       |
| loop              | `{ type: 'loop'; body: EventCommand[] }`                                                 |
| break_loop        | `{ type: 'break_loop' }`                                                                 |
| label             | `{ type: 'label'; name: string }`                                                        |
| jump              | `{ type: 'jump'; label: string }`                                                        |
| wait              | `{ type: 'wait'; ms: number }`                                                           |
| exit              | `{ type: 'exit' }` (sort de la page en cours)                                            |

#### État projet

✅ Toutes livrées en v0.6 — voir section 2.1.

#### Mouvement / apparence d'events

| Cmd             | Forme                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| move_route      | `{ type: 'move_route'; eventId: string \| 'this' \| 'player'; route: MovementStep[]; wait: boolean }` |
| change_graphic  | `{ type: 'change_graphic'; eventId: string \| 'this'; spriteId: string \| null; frame: number; direction: 'up'\|'down'\|'left'\|'right' }` |
| set_visible     | `{ type: 'set_visible'; eventId: string \| 'this'; visible: boolean }`  |

#### Médias & effets

| Cmd            | Forme                                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| play_sfx       | `{ type: 'play_sfx'; assetId: string; volume?: number }`                          |
| play_bgm       | `{ type: 'play_bgm'; assetId: string \| null; volume?: number; fadeMs?: number }` |
| stop_bgm       | `{ type: 'stop_bgm'; fadeMs?: number }`                                           |
| screen_fade    | `{ type: 'screen_fade'; direction: 'in' \| 'out'; ms: number }`                   |
| screen_shake   | `{ type: 'screen_shake'; power: number; ms: number }`                             |

#### Scène

| Cmd          | Forme                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| transfer (v2)| ajouter `fade?: { out: number; in: number }` et `direction?: 'up'\|'down'\|'left'\|'right'` pour orienter le player à l'arrivée |
| call_common  | `{ type: 'call_common'; commonEventId: string }`                               |

### 2.3 Renvoyées en Phase 4+

| Cmd             | Forme                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| change_gold     | `{ type: 'change_gold'; op: '+=' \| '-='; amount: number }`                  |
| change_items    | `{ type: 'change_items'; itemId: string; op: '+=' \| '-='; count: number }`  |
| change_party    | `{ type: 'change_party'; op: 'add' \| 'remove'; actorId: string }`           |
| change_hp       | `{ type: 'change_hp'; target: 'party' \| { actorId: string }; op: '+=' \| '-=' \| '='; amount: number }` |
| start_battle    | `{ type: 'start_battle'; troopId: string; canEscape: boolean; onWin?: EventCommand[]; onLose?: EventCommand[] }` |
| game_over       | `{ type: 'game_over' }`                                                      |

---

## 3. Runtime — interpréteur

Localisation : `packages/engine` ou `apps/player/src/events/EventRunner.ts`
(selon refactor P3).

### 3.1 Contrat

```ts
interface EventContext {
  scene: Phaser.Scene;
  project: Project;
  map: GameMap;
  event: MapEvent;
  page: EventPage;
  switches: SwitchStore;
  variables: VariableStore;
  selfSwitches: SelfSwitchStore;
  player: Player;
  // ...
}

async function runCommands(ctx: EventContext, commands: EventCommand[]): Promise<ExecResult>;
```

Résultat : `'done' | 'transferred' | 'exited'`. `transferred` interrompt la
boucle de l'event en cours car la scène est restart.

### 3.2 Règles d'exécution

- Une seule commande à la fois par event (pas de parallélisme interne).
- Un event `parallel` est re-scheduled si son body finit — sauf `exit`.
- Un event `auto` marque un flag de "a tourné une fois" (équivalent
  `self_switch` interne) pour ne pas reboucler infiniment.
- Le player est freeze pendant un `action` / `contact` / `auto`.
- `parallel` ne freeze pas le player.
- Les `wait` / `move_route wait:true` suspendent via `await` un timer scène.

### 3.3 Stores

Tous par-user (règle absolue SRB). Tant que P5 n'est pas livré, vivent en
mémoire player + persistés avec les saves locales.

```ts
interface SwitchStore       { get(id: string): boolean; set(id, v): void; }
interface VariableStore     { get(id: string): number;  set(id, v): void; }
interface SelfSwitchStore   { get(eventKey: string, id: 'A'|'B'|'C'|'D'): boolean; set(...); }
```

`eventKey` : `${mapId}:${eventId}`.

---

## 4. Compatibilité & versioning

- Le type `EventCommand` est une **union discriminée** : ajouter un nouveau
  type est **non-breaking**. Renommer ou supprimer un `type` existant est
  **breaking** → bump major du format projet.
- À chaque commande ajoutée en production : la spec est mise à jour dans la
  même PR, avec un exemple JSON minimal.
- Les projets sauvegardés avec un type inconnu tombent en no-op + warning
  console (pas de crash). Un projet ne peut pas dépendre d'une commande hors
  catalogue officiel.

---

## 5. Exemples

### 5.1 PNJ qui parle et donne 10 gold une seule fois

```json
{
  "id": "villager-01",
  "name": "Villageois",
  "x": 5,
  "y": 7,
  "pages": [
    {
      "conditions": [{ "type": "self_switch", "id": "A", "value": false }],
      "trigger": "action",
      "graphic": { "spriteId": "villager", "direction": "down", "frame": 0 },
      "movement": { "type": "fixed" },
      "commands": [
        { "type": "show_text", "text": "Prends ça, voyageur." },
        { "type": "change_gold", "op": "+=", "amount": 10 },
        { "type": "set_self_switch", "id": "A", "value": true }
      ]
    },
    {
      "conditions": [{ "type": "self_switch", "id": "A", "value": true }],
      "trigger": "action",
      "graphic": { "spriteId": "villager", "direction": "down", "frame": 0 },
      "movement": { "type": "fixed" },
      "commands": [
        { "type": "show_text", "text": "Bonne route !" }
      ]
    }
  ]
}
```

### 5.2 Porte conditionnée par un switch

```json
{
  "trigger": "action",
  "conditions": [{ "type": "switch", "id": "has-key", "value": true }],
  "commands": [
    { "type": "play_sfx", "assetId": "door-unlock" },
    { "type": "transfer", "mapId": "castle-hall", "x": 10, "y": 12 }
  ]
}
```
