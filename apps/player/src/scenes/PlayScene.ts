import * as Phaser from 'phaser';
import type { CharacterSheet, GameMap } from '@srb/types';
import { renderMapBase, renderMapOverlay, TILE_SIZE } from '../rendering/MapRenderer';
import { isFeetBlocked } from '../systems/collision';
import { findEventAt, getActivePage, runCommands } from '../systems/EventRunner';
import { InputProvider } from '../systems/InputProvider';
import { Player } from '../entities/Player';
import { loadMap } from '../loaders/map-loader';

const MOVE_SPEED_PX_PER_SEC = 160;

interface PlaySceneData {
  map: GameMap;
  playerSheet: CharacterSheet;
  /** Optional spawn tile — used when arriving from a transfer. */
  spawnTileX?: number;
  spawnTileY?: number;
}

export class PlayScene extends Phaser.Scene {
  private map!: GameMap;
  private playerSheet!: CharacterSheet;
  private spawnTileX?: number;
  private spawnTileY?: number;
  private player!: Player;
  private input2!: InputProvider;
  private lastPlayerTileKey = '';
  private transferring = false;

  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data: PlaySceneData): void {
    this.map = data.map;
    this.playerSheet = data.playerSheet;
    this.spawnTileX = data.spawnTileX;
    this.spawnTileY = data.spawnTileY;
    this.transferring = false;
  }

  create(): void {
    const worldWidth = this.map.width * TILE_SIZE;
    const worldHeight = this.map.height * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    renderMapBase(this, this.map);

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
    // Seed the last-tile so we don't re-trigger the event we just arrived on.
    this.lastPlayerTileKey = `${spawnTileX},${spawnTileY}`;

    renderMapOverlay(this, this.map);

    this.cameras.main.startFollow(this.player.sprite, true);

    this.input2 = new InputProvider(this);

    this.add
      .text(8, 8, `SRB — ${this.map.name} — arrow keys to move`, {
        color: '#888',
        fontSize: '12px',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0);
  }

  override update(_time: number, delta: number): void {
    if (this.transferring) return;

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
      !isFeetBlocked(this.map, this.player.x + intentDx, this.player.y, fpW, fpH)
    ) {
      this.player.x += intentDx;
      appliedDx = intentDx;
    }
    if (
      intentDy !== 0 &&
      !isFeetBlocked(this.map, this.player.x, this.player.y + intentDy, fpW, fpH)
    ) {
      this.player.y += intentDy;
      appliedDy = intentDy;
    }

    this.player.syncMovement(appliedDx, appliedDy);
    this.checkContactEvents();
  }

  /** Checks whether the player just stepped onto a new tile and triggers its contact event. */
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

    runCommands(page.commands, {
      onTransfer: (mapId, dstX, dstY) => {
        void this.transferTo(mapId, dstX, dstY);
      },
    });
  }

  private async transferTo(mapId: string, tileX: number, tileY: number): Promise<void> {
    this.transferring = true;
    try {
      const newMap = await loadMap(mapId);
      this.scene.restart({
        map: newMap,
        playerSheet: this.playerSheet,
        spawnTileX: tileX,
        spawnTileY: tileY,
      } satisfies PlaySceneData);
    } catch (err) {
      console.error('[transferTo] failed', err);
      this.transferring = false;
    }
  }
}
