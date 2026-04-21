import * as Phaser from 'phaser';

const MOVE_SPEED_PX_PER_SEC = 200;
const PLAYER_SIZE = 32;
const PLAYER_COLOR = 0xff6b6b;

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1a1a1a');

    this.player = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      PLAYER_SIZE,
      PLAYER_SIZE,
      PLAYER_COLOR,
    );

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input plugin not available');
    }
    this.cursors = keyboard.createCursorKeys();

    this.add.text(8, 8, 'SRB — use arrow keys', {
      color: '#888',
      fontSize: '12px',
      fontFamily: 'monospace',
    });
  }

  override update(_time: number, delta: number): void {
    const distance = (MOVE_SPEED_PX_PER_SEC * delta) / 1000;

    if (this.cursors.left.isDown) this.player.x -= distance;
    if (this.cursors.right.isDown) this.player.x += distance;
    if (this.cursors.up.isDown) this.player.y -= distance;
    if (this.cursors.down.isDown) this.player.y += distance;
  }
}
