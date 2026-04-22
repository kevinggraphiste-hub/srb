import * as Phaser from 'phaser';

/**
 * Unified input abstraction — merges keyboard arrow keys + Space with an
 * on-screen virtual dpad + A button. Consumers call isLeft/isRight/isUp/
 * isDown and justPressedAction without caring about the device. The touch
 * controls only appear on touch devices.
 */

const DPAD_BUTTON_RADIUS = 28;
const DPAD_MARGIN = 24;
const DPAD_ALPHA_IDLE = 0.35;
const DPAD_ALPHA_DOWN = 0.6;
const DPAD_COLOR = 0xe0e0e0;
const ACTION_BUTTON_COLOR = 0xff6b6b;

type DirectionKey = 'left' | 'right' | 'up' | 'down';

export class InputProvider {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private actionKey?: Phaser.Input.Keyboard.Key;
  private touchState: Record<DirectionKey, boolean> = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  private touchActionPending = false;

  private cancelKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.actionKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.cancelKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }
    if (InputProvider.isTouchDevice()) {
      this.setupTouchDpad(scene);
      this.setupTouchActionButton(scene);
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

  /** True for a single frame when Space or the touch A button was just pressed. */
  justPressedAction(): boolean {
    if (this.actionKey && Phaser.Input.Keyboard.JustDown(this.actionKey)) {
      return true;
    }
    if (this.touchActionPending) {
      this.touchActionPending = false;
      return true;
    }
    return false;
  }

  /** True for a single frame when Escape was just pressed. Keyboard only. */
  justPressedCancel(): boolean {
    return this.cancelKey ? Phaser.Input.Keyboard.JustDown(this.cancelKey) : false;
  }

  /** True for a single frame when Up was just pressed. Used for menu nav. */
  justPressedUp(): boolean {
    return this.cursors?.up ? Phaser.Input.Keyboard.JustDown(this.cursors.up) : false;
  }

  /** True for a single frame when Down was just pressed. Used for menu nav. */
  justPressedDown(): boolean {
    return this.cursors?.down ? Phaser.Input.Keyboard.JustDown(this.cursors.down) : false;
  }

  private setupTouchDpad(scene: Phaser.Scene): void {
    const viewH = scene.scale.height;
    const baseX = DPAD_MARGIN + DPAD_BUTTON_RADIUS;
    const baseY = viewH - DPAD_MARGIN - DPAD_BUTTON_RADIUS * 2;
    const spacing = DPAD_BUTTON_RADIUS * 2 + 4;

    this.createDpadButton(scene, baseX, baseY, 'up');
    this.createDpadButton(scene, baseX, baseY + spacing * 2, 'down');
    this.createDpadButton(scene, baseX - spacing, baseY + spacing, 'left');
    this.createDpadButton(scene, baseX + spacing, baseY + spacing, 'right');
  }

  private setupTouchActionButton(scene: Phaser.Scene): void {
    const viewW = scene.scale.width;
    const viewH = scene.scale.height;
    const x = viewW - DPAD_MARGIN - DPAD_BUTTON_RADIUS;
    const y = viewH - DPAD_MARGIN - DPAD_BUTTON_RADIUS;

    const circle = scene.add
      .circle(x, y, DPAD_BUTTON_RADIUS, ACTION_BUTTON_COLOR, DPAD_ALPHA_IDLE)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    scene.add
      .text(x, y, 'A', {
        color: '#ffffff',
        fontSize: '22px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    circle.on('pointerdown', () => {
      this.touchActionPending = true;
      circle.fillAlpha = DPAD_ALPHA_DOWN;
    });
    const release = (): void => {
      circle.fillAlpha = DPAD_ALPHA_IDLE;
    };
    circle.on('pointerup', release);
    circle.on('pointerout', release);
    circle.on('pointerupoutside', release);
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
