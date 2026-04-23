import * as Phaser from 'phaser';
import type {
  CharacterSheet,
  CollisionGrid,
  EventCommand,
  GameMap,
  ShowChoicesChoice,
} from '@srb/types';
import { renderMapBase, renderMapOverlay, TILE_SIZE } from '../rendering/MapRenderer';
import { isFeetBlocked } from '../systems/collision';
import { findEventAt, getActivePage } from '../systems/EventRunner';
import { InputProvider } from '../systems/InputProvider';
import { Player } from '../entities/Player';
import { loadMap } from '../loaders/map-loader';
import { loadCharacterSheet } from '../loaders/character-loader';
import { DialogBox } from '../ui/DialogBox';
import { isPreviewMode } from '../preview';

const EVENT_TRIGGER_COLOR: Record<string, number> = {
  action: 0x4da6ff,
  contact: 0xff9f43,
  auto: 0x9b59b6,
  parallel: 0x2ecc71,
};

const MOVE_SPEED_PX_PER_SEC = 160;

interface PlaySceneData {
  map: GameMap;
  playerSheet: CharacterSheet;
  npcSheets: CharacterSheet[];
  spawnTileX?: number;
  spawnTileY?: number;
}

export class PlayScene extends Phaser.Scene {
  private map!: GameMap;
  private playerSheet!: CharacterSheet;
  private npcSheets: CharacterSheet[] = [];
  private spawnTileX?: number;
  private spawnTileY?: number;

  private player!: Player;
  private input2!: InputProvider;
  private dialogBox!: DialogBox;

  /** Static collision from the map + NPC tiles (merged at create time). */
  private effectiveCollision!: CollisionGrid;

  private lastPlayerTileKey = '';
  private transferring = false;

  /** Queue of commands waiting to run (while show_text is blocking). */
  private pendingCommands: EventCommand[] = [];
  /** Active choice list when the dialog is in choices mode. null otherwise. */
  private pendingChoices: ShowChoicesChoice[] | null = null;

  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data: PlaySceneData): void {
    this.map = data.map;
    this.playerSheet = data.playerSheet;
    this.npcSheets = data.npcSheets ?? [];
    this.spawnTileX = data.spawnTileX;
    this.spawnTileY = data.spawnTileY;
    this.transferring = false;
    this.pendingCommands = [];
    this.pendingChoices = null;
  }

  create(): void {
    const worldWidth = this.map.width * TILE_SIZE;
    const worldHeight = this.map.height * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    renderMapBase(this, this.map);
    this.effectiveCollision = this.map.collision.map((row) => [...row]);
    this.spawnNpcs();
    // NPC tiles become blocking for the player. Collision on the whole tile
    // feels right here; the y-sort below keeps visuals natural when the player
    // passes above an NPC (player is rendered behind the NPC sprite).
    for (const event of this.map.events) {
      const page = event.pages[0];
      if (!page || !page.graphic.spriteId) continue;
      const row = this.effectiveCollision[event.y];
      if (row) row[event.x] = true;
    }

    const spawnTileX =
      this.spawnTileX ?? this.map.defaultSpawnTile?.x ?? Math.floor(this.map.width / 2);
    const spawnTileY =
      this.spawnTileY ?? this.map.defaultSpawnTile?.y ?? Math.floor(this.map.height / 2);
    this.player = new Player(
      this,
      spawnTileX * TILE_SIZE + TILE_SIZE / 2,
      (spawnTileY + 1) * TILE_SIZE,
      this.playerSheet,
    );
    this.lastPlayerTileKey = `${spawnTileX},${spawnTileY}`;

    // Overlay tiles (roofs, treetops) render above every character by depth
    // regardless of feet-y. Large constant safely beats any map height.
    const overlay = renderMapOverlay(this, this.map);
    overlay?.setDepth(100000);

    this.cameras.main.startFollow(this.player.sprite, true);

    this.input2 = new InputProvider(this);
    this.dialogBox = new DialogBox(this);

    if (isPreviewMode()) this.drawEventDebugMarkers();

    this.add
      .text(8, 8, `SRB — ${this.map.name}`, {
        color: '#888',
        fontSize: '12px',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0);
  }

  override update(_time: number, delta: number): void {
    if (this.transferring) return;

    // If a dialog is open, Space advances (text mode) or confirms (choices).
    // No movement meanwhile.
    const dialogMode = this.dialogBox.getMode();
    if (dialogMode === 'text') {
      if (this.input2.justPressedAction()) {
        this.dialogBox.close();
        this.runNextPendingCommand();
      }
      return;
    }
    if (dialogMode === 'choices') {
      if (this.input2.justPressedUp()) this.dialogBox.moveCursor(-1);
      if (this.input2.justPressedDown()) this.dialogBox.moveCursor(1);
      if (this.input2.justPressedAction()) {
        this.resolveChoice(this.dialogBox.getSelectedIndex());
      } else if (this.input2.justPressedCancel()) {
        const ci = this.dialogBox.getCancelIndex();
        if (ci !== null) this.resolveChoice(ci);
      }
      return;
    }

    // Action trigger has priority over movement (feels right: you face the NPC, press A, you talk).
    if (this.input2.justPressedAction() && this.tryTriggerActionEvent()) {
      return;
    }

    this.updateMovement(delta);
  }

  private resolveChoice(index: number): void {
    const choices = this.pendingChoices;
    if (!choices) {
      this.dialogBox.close();
      this.runNextPendingCommand();
      return;
    }
    const picked = choices[index];
    this.dialogBox.close();
    this.pendingChoices = null;
    if (picked) {
      this.pendingCommands = [...picked.branch, ...this.pendingCommands];
    }
    this.runNextPendingCommand();
  }

  private updateMovement(delta: number): void {
    const distance = (MOVE_SPEED_PX_PER_SEC * delta) / 1000;

    let intentDx = 0;
    let intentDy = 0;
    if (this.input2.isLeft()) intentDx -= distance;
    if (this.input2.isRight()) intentDx += distance;
    if (this.input2.isUp()) intentDy -= distance;
    if (this.input2.isDown()) intentDy += distance;

    const fpW = this.player.footprintWidth;
    const fpH = this.player.footprintHeight;

    let appliedDx = 0;
    let appliedDy = 0;
    if (
      intentDx !== 0 &&
      !isFeetBlocked(
        this.effectiveCollision,
        this.map.width,
        this.map.height,
        this.player.x + intentDx,
        this.player.y,
        fpW,
        fpH,
      )
    ) {
      this.player.x += intentDx;
      appliedDx = intentDx;
    }
    if (
      intentDy !== 0 &&
      !isFeetBlocked(
        this.effectiveCollision,
        this.map.width,
        this.map.height,
        this.player.x,
        this.player.y + intentDy,
        fpW,
        fpH,
      )
    ) {
      this.player.y += intentDy;
      appliedDy = intentDy;
    }

    this.player.syncMovement(appliedDx, appliedDy);
    // Y-sort: the player's depth is its feet-y, so it's drawn behind NPCs whose
    // feet are below it and in front of NPCs whose feet are above it. RPG-Maker
    // / JRPG convention; keeps overlap natural when walking past characters.
    this.player.sprite.setDepth(this.player.y);
    this.checkContactEvents();
  }

  private spawnNpcs(): void {
    for (const event of this.map.events) {
      const page = event.pages[0];
      if (!page || !page.graphic.spriteId) continue;
      const sheet = this.npcSheets.find((s) => s.id === page.graphic.spriteId);
      if (!sheet) continue;

      Player.ensureAnims(this, sheet);

      const feetX = event.x * TILE_SIZE + TILE_SIZE / 2;
      const feetY = (event.y + 1) * TILE_SIZE;

      const sprite = this.add.sprite(
        feetX,
        feetY,
        sheet.id,
        sheet.idleFrames[page.graphic.direction],
      );
      sprite.setOrigin(sheet.originX, sheet.originY);
      if (sheet.tint !== undefined) {
        sprite.setTint(sheet.tint);
      }
      sprite.setDepth(feetY);
    }
  }

  /** Detects 'contact' trigger when player steps onto a new tile. */
  private checkContactEvents(): void {
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor((this.player.y - 1) / TILE_SIZE);
    const key = `${tileX},${tileY}`;
    if (key === this.lastPlayerTileKey) return;
    this.lastPlayerTileKey = key;

    const event = findEventAt(this.map, tileX, tileY);
    if (!event) return;
    const page = getActivePage(event);
    if (!page || page.trigger !== 'contact') return;
    this.beginCommands(page.commands);
  }

  /** Detects 'action' trigger on the tile directly in front of the player. */
  private tryTriggerActionEvent(): boolean {
    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor((this.player.y - 1) / TILE_SIZE);
    let tx = playerTileX;
    let ty = playerTileY;
    switch (this.player.facing) {
      case 'up':
        ty -= 1;
        break;
      case 'down':
        ty += 1;
        break;
      case 'left':
        tx -= 1;
        break;
      case 'right':
        tx += 1;
        break;
    }
    const event = findEventAt(this.map, tx, ty);
    if (!event) return false;
    const page = getActivePage(event);
    if (!page || page.trigger !== 'action') return false;
    this.beginCommands(page.commands);
    return true;
  }

  /** Queue a list of commands and start running them. */
  private beginCommands(commands: readonly EventCommand[]): void {
    this.pendingCommands = [...commands];
    this.runNextPendingCommand();
  }

  /** Executes commands one by one, pausing when a blocking command (show_text) opens UI. */
  private runNextPendingCommand(): void {
    while (this.pendingCommands.length > 0) {
      const cmd = this.pendingCommands.shift()!;
      switch (cmd.type) {
        case 'transfer':
          void this.transferTo(cmd.mapId, cmd.x, cmd.y);
          this.pendingCommands = [];
          return;
        case 'show_text':
          this.dialogBox.openText({ text: cmd.text, speaker: cmd.speaker });
          return; // wait until dialog is closed by the player
        case 'show_choices':
          this.pendingChoices = cmd.choices;
          this.dialogBox.openChoices({
            prompt: cmd.prompt,
            choices: cmd.choices.map((c) => ({ label: c.label })),
            defaultIndex: cmd.defaultIndex,
            cancelIndex: cmd.cancelIndex,
          });
          return;
        case 'script':
          console.warn('[event:script] not yet implemented');
          break;
        case 'placeholder':
          break;
      }
    }
  }

  private async transferTo(mapId: string, tileX: number, tileY: number): Promise<void> {
    if (!mapId) {
      this.showRuntimeError(
        'Téléporteur non configuré : aucune map cible choisie. Ouvre le panneau Event pour la définir.',
      );
      return;
    }
    this.transferring = true;
    try {
      const newMap = await loadMap(mapId);
      const npcSheets = await this.ensureNpcSheetsFor(newMap);
      this.scene.restart({
        map: newMap,
        playerSheet: this.playerSheet,
        npcSheets,
        spawnTileX: tileX,
        spawnTileY: tileY,
      } satisfies PlaySceneData);
    } catch (err) {
      console.error('[transferTo] failed', err);
      const reason = err instanceof Error ? err.message : 'erreur inconnue';
      this.transferring = false;
      this.showRuntimeError(`Téléportation vers « ${mapId} » échouée : ${reason}`);
    }
  }

  /**
   * Loads any character sheet referenced by the target map that wasn't already
   * loaded for the current one. Without this, NPCs on the destination map
   * silently fail to spawn after a transfer.
   */
  private async ensureNpcSheetsFor(map: GameMap): Promise<CharacterSheet[]> {
    const required = new Set<string>();
    for (const event of map.events) {
      for (const page of event.pages) {
        if (page.graphic.spriteId) required.add(page.graphic.spriteId);
      }
    }
    const byId = new Map(this.npcSheets.map((s) => [s.id, s] as const));
    const missing = [...required].filter((id) => !byId.has(id));
    if (missing.length === 0) return this.npcSheets;
    const loaded = await Promise.all(
      missing.map(async (id) => {
        try {
          return await loadCharacterSheet(id);
        } catch (err) {
          console.warn(`[transferTo] missing sprite sheet "${id}":`, err);
          return null;
        }
      }),
    );
    return [...this.npcSheets, ...loaded.filter((s): s is CharacterSheet => s !== null)];
  }

  private drawEventDebugMarkers(): void {
    const markers = this.add.graphics();
    markers.setDepth(90000);
    for (const event of this.map.events) {
      const page = event.pages[0];
      if (!page) continue;
      if (page.graphic.spriteId) continue;
      const cx = event.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = event.y * TILE_SIZE + TILE_SIZE / 2;
      const color = EVENT_TRIGGER_COLOR[page.trigger] ?? 0x4da6ff;
      markers.lineStyle(2, color, 0.9);
      markers.fillStyle(color, 0.18);
      markers.fillCircle(cx, cy, TILE_SIZE * 0.35);
      markers.strokeCircle(cx, cy, TILE_SIZE * 0.35);
      const letter = (page.trigger[0] ?? 'A').toUpperCase();
      this.add
        .text(cx, cy, letter, {
          color: '#ffffff',
          fontSize: '12px',
          fontFamily: 'monospace',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(90001);
    }
  }

  private showRuntimeError(message: string): void {
    this.dialogBox.openText({ text: `⚠ ${message}`, speaker: 'SRB' });
  }
}
