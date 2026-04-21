import * as Phaser from 'phaser';

const APP_VERSION = '0.2.3';

export class MenuScene extends Phaser.Scene {
  private blinkTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 80, 'SRB', {
        color: '#ff6b6b',
        fontSize: '64px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 20, 'ScarletWolf RPG Builder', {
        color: '#e0e0e0',
        fontSize: '16px',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 10, `v${APP_VERSION}`, {
        color: '#555',
        fontSize: '10px',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(centerX, centerY + 70, 'Press Enter or click to start', {
        color: '#888',
        fontSize: '14px',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.blinkTween = this.tweens.add({
      targets: startText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame(): void {
    this.blinkTween?.stop();
    this.scene.start('LoadScene');
  }
}
