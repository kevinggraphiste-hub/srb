import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
import { renderMapBase, renderMapOverlay, TILE_SIZE } from '../rendering/MapRenderer';
import { isFeetBlocked } from '../systems/collision';

const MOVE_SPEED_PX_PER_SEC = 200;
const PLAYER_WIDTH = TILE_SIZE;
const PLAYER_HEIGHT = TILE_SIZE * 2;
const PLAYER_COLOR = 0xff6b6b;

interface PlaySceneData {
  map: GameMap;
}

export class PlayScene extends Phaser.Scene {
  private map!: GameMap;
  private player!: Phaser.GameObjects.Rectangle;
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
    this.player = this.add.rectangle(
      startTileX * TILE_SIZE + TILE_SIZE / 2,
      (startTileY + 1) * TILE_SIZE,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      PLAYER_COLOR,
    );
    this.player.setOrigin(0.5, 1);

    renderMapOverlay(this, this.map);

    this.cameras.main.startFollow(this.player, true);

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

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= distance;
    if (this.cursors.right.isDown) dx += distance;
    if (this.cursors.up.isDown) dy -= distance;
    if (this.cursors.down.isDown) dy += distance;

    if (dx !== 0 && !isFeetBlocked(this.map, this.player.x + dx, this.player.y)) {
      this.player.x += dx;
    }
    if (dy !== 0 && !isFeetBlocked(this.map, this.player.x, this.player.y + dy)) {
      this.player.y += dy;
    }
  }
}
