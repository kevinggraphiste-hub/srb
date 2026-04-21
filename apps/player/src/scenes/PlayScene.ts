import * as Phaser from 'phaser';
import type { CharacterSheet, CollisionGrid, EventCommand, GameMap } from '@srb/types';
import { renderMapBase, renderMapOverlay, TILE_SIZE } from '../rendering/MapRenderer';
import { isFeetBlocked } from '../systems/collision';
import { findEventAt, getActivePage } from '../systems/EventRunner';
import { InputProvider } from '../systems/InputProvider';
import { Player } from '../entities/Player';
import { loadMap } from '../loaders/map-loader';
import { DialogBox } from '../ui/DialogBox';

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

  /** Static collision from the map merged with NPC tiles. */
  private effectiveCollision!: CollisionGrid;

  private lastPlayerTileKey = '';
  private transferring = false;

  /** Queue of commands waiting to run (while show_text is blocking). */
  private pendingCommands: EventCommand[] = [];

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
  }

  create(): void {
    const worldWidth = this.map.width * TILE_SIZE;
    const worldHeight = this.map.height * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    renderMapBase(this, this.map);
    this.spawnNpcs();
    this.buildEffectiveCollision();

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

    renderMapOverlay(this, this.map);

    this.cameras.main.startFollow(this.player.sprite, true);

    this.input2 = new InputProvider(this);
    this.dialogBox = new DialogBox(this);

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

    // If a dialog is open, Space advances. No movement meanwhile.
    if (this.dialogBox.isOpen()) {
      if (this.input2.justPressedAction()) {
        this.dialogBox.close();
        this.runNextPendingCommand();
      }
      return;
    }

    // Action trigger has priority over movement (feels right: you face the NPC, press A, you talk).
    if (this.input2.justPressedAction() && this.tryTriggerActionEvent()) {
      return;
    }

    this.updateMovement(delta);
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
    this.checkContactEvents();
  }

  private spawnNpcs(): void {
    for (const event of this.map.events) {
      const page = event.pages[0];
      if (!page || !page.graphic.spriteId) continue;
      const sheet = this.npcSheets.find((s) => s.id === page.graphic.spriteId);
      if (!sheet) continue;

      Player.ensureAnims(this, sheet);

      const sprite = this.add.sprite(
        event.x * TILE_SIZE + TILE_SIZE / 2,
        (event.y + 1) * TILE_SIZE,
        sheet.id,
        sheet.idleFrames[page.graphic.direction],
      );
      sprite.setOrigin(sheet.originX, sheet.originY);
      if (sheet.tint !== undefined) {
        sprite.setTint(sheet.tint);
      }
    }
  }

  private buildEffectiveCollision(): void {
    this.effectiveCollision = this.map.collision.map((row) => [...row]);
    for (const event of this.map.events) {
      const page = event.pages[0];
      if (!page || !page.graphic.spriteId) continue;
      const row = this.effectiveCollision[event.y];
      if (row) row[event.x] = true;
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
          this.dialogBox.open(cmd.text);
          return; // wait until dialog is closed by the player
        case 'script':
          console.warn('[event:script] not yet implemented');
          break;
        case 'placeholder':
          break;
      }
    }
  }

  private async transferTo(mapId: string, tileX: number, tileY: number): Promise<void> {
    this.transferring = true;
    try {
      const newMap = await loadMap(mapId);
      this.scene.restart({
        map: newMap,
        playerSheet: this.playerSheet,
        npcSheets: this.npcSheets,
        spawnTileX: tileX,
        spawnTileY: tileY,
      } satisfies PlaySceneData);
    } catch (err) {
      console.error('[transferTo] failed', err);
      this.transferring = false;
    }
  }
}
