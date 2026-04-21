import type * as Phaser from 'phaser';

/**
 * Unified input abstraction — merges keyboard arrow keys with an on-screen
 * virtual dpad. Consumers call isLeft()/isRight()/isUp()/isDown() without
 * caring about the device. The dpad only appears on touch devices.
 */

const DPAD_BUTTON_RADIUS = 28;
const DPAD_MARGIN = 24;
const DPAD_ALPHA_IDLE = 0.35;
const DPAD_ALPHA_DOWN = 0.6;
const DPAD_COLOR = 0xe0e0e0;

type DirectionKey = 'left' | 'right' | 'up' | 'down';

export class InputProvider {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private touchState: Record<DirectionKey, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  constructor(scene: Phaser.Scene) {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    }
    if (InputProvider.isTouchDevice()) {
      this.setupTouchDpad(scene);
    }
  }

  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  isLeft(): boolean {
    return (this.cursors?.left.isDown ?? false) || this.touchState.left;
  }
  isRight(): boolean {
    return (this.cursors?.right.isDown ?? false) || this.touchState.right;
  }
  isUp(): boolean {
    return (this.cursors?.up.isDown ?? false) || this.touchState.up;
  }
  isDown(): boolean {
    return (this.cursors?.down.isDown ?? false) || this.touchState.down;
  }

  private setupTouchDpad(scene: Phaser.Scene): void {
    const viewH = scene.scale.height;
    const baseX = DPAD_MARGIN + DPAD_BUTTON_RADIUS;
    const baseY = viewH - DPAD_MARGIN - DPAD_BUTTON_RADIUS * 2;
    const spacing = DPAD_BUTTON_RADIUS * 2 + 4;

    // Position each button around a center "base".
    this.createDpadButton(scene, baseX, baseY, 'up');
    this.createDpadButton(scene, baseX, baseY + spacing * 2, 'down');
    this.createDpadButton(scene, baseX - spacing, baseY + spacing, 'left');
    this.createDpadButton(scene, baseX + spacing, baseY + spacing, 'right');
  }

  private createDpadButton(scene: Phaser.Scene, x: number, y: number, dir: DirectionKey): void {
    const circle = scene.add
      .circle(x, y, DPAD_BUTTON_RADIUS, DPAD_COLOR, DPAD_ALPHA_IDLE)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    const symbol = this.getDirectionSymbol(dir);
    scene.add
      .text(x, y, symbol, {
        color: '#0a0a0a',
        fontSize: '24px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    circle.on('pointerdown', () => {
      this.touchState[dir] = true;
      circle.fillAlpha = DPAD_ALPHA_DOWN;
    });
    const release = (): void => {
      this.touchState[dir] = false;
      circle.fillAlpha = DPAD_ALPHA_IDLE;
    };
    circle.on('pointerup', release);
    circle.on('pointerout', release);
    circle.on('pointerupoutside', release);
  }

  private getDirectionSymbol(dir: DirectionKey): string {
    switch (dir) {
      case 'up':
        return '▲';
      case 'down':
        return '▼';
      case 'left':
        return '◀';
      case 'right':
        return '▶';
    }
  }
}
