import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
import { renderMapBase, renderMapOverlay, TILE_SIZE } from '../rendering/MapRenderer';
import { isFeetBlocked } from '../systems/collision';
import { Player } from '../entities/Player';

const MOVE_SPEED_PX_PER_SEC = 160;

interface PlaySceneData {
  map: GameMap;
}

export class PlayScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data: PlaySceneData): void {
    this.map = data.map;
  }

  create(): void {
    const worldWidth = this.map.width * TILE_SIZE;
    const worldHeight = this.map.height * TILE_SIZE;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    renderMapBase(this, this.map);

    const startTileX = Math.floor(this.map.width / 2);
    const startTileY = Math.floor(this.map.height / 2);
    this.player = new Player(
      this,
      startTileX * TILE_SIZE + TILE_SIZE / 2,
      (startTileY + 1) * TILE_SIZE,
    );

    renderMapOverlay(this, this.map);

    this.cameras.main.startFollow(this.player.sprite, true);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin not available');
    }
    this.cursors = keyboard.createCursorKeys();

    this.add
      .text(8, 8, `SRB — ${this.map.name} — arrow keys to move`, {
        color: '#888',
        fontSize: '12px',
        fontFamily: 'monospace',
      })
      .setScrollFactor(0);
  }

  override update(_time: number, delta: number): void {
    const distance = (MOVE_SPEED_PX_PER_SEC * delta) / 1000;

    let intentDx = 0;
    let intentDy = 0;
    if (this.cursors.left.isDown) intentDx -= distance;
    if (this.cursors.right.isDown) intentDx += distance;
    if (this.cursors.up.isDown) intentDy -= distance;
    if (this.cursors.down.isDown) intentDy += distance;

    let appliedDx = 0;
    let appliedDy = 0;
    if (intentDx !== 0 && !isFeetBlocked(this.map, this.player.x + intentDx, this.player.y)) {
      this.player.x += intentDx;
      appliedDx = intentDx;
    }
    if (intentDy !== 0 && !isFeetBlocked(this.map, this.player.x, this.player.y + intentDy)) {
      this.player.y += intentDy;
      appliedDy = intentDy;
    }

    this.player.syncAnimation(appliedDx, appliedDy);
  }
}
