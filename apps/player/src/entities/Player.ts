import * as Phaser from 'phaser';

export type Direction = 'down' | 'left' | 'right' | 'up';

/** Pixel size of a single frame inside the RPG-Maker-XP style sprite sheet. */
export const PLAYER_FRAME_WIDTH = 32;
export const PLAYER_FRAME_HEIGHT = 48;

const FRAMES_PER_DIRECTION = 4;
const FRAME_RATE = 8;

/**
 * Sheet layout: 4 rows (directions) × 4 columns (walk cycle).
 * Default order assumed here is RPG-Maker-XP classic: down / left / right / up.
 * If the provided sheet swaps a row, update ROW_FOR_DIRECTION.
 */
const ROW_FOR_DIRECTION: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

/**
 * Asset key used when loading the sprite sheet in LoadScene.
 * Single default character for Phase 1. Multi-character support arrives in Phase 2+.
 */
export const PLAYER_SHEET_KEY = 'ash';
export const PLAYER_SHEET_PATH = '/assets/characters/ash.png';

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private direction: Direction = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.sprite(x, y, PLAYER_SHEET_KEY, 0);
    this.sprite.setOrigin(0.5, 1);
    Player.ensureAnims(scene);
    this.setIdleFrame();
  }

  /** Creates walk animations once per scene; safe to call multiple times. */
  static ensureAnims(scene: Phaser.Scene): void {
    (['down', 'left', 'right', 'up'] as const).forEach((dir) => {
      const key = `walk-${dir}`;
      if (scene.anims.exists(key)) return;
      const startFrame = ROW_FOR_DIRECTION[dir] * FRAMES_PER_DIRECTION;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(PLAYER_SHEET_KEY, {
          start: startFrame,
          end: startFrame + FRAMES_PER_DIRECTION - 1,
        }),
        frameRate: FRAME_RATE,
        repeat: -1,
      });
    });
  }

  get x(): number {
    return this.sprite.x;
  }
  set x(value: number) {
    this.sprite.x = value;
  }
  get y(): number {
    return this.sprite.y;
  }
  set y(value: number) {
    this.sprite.y = value;
  }

  /**
   * Updates sprite direction + animation based on the current frame's movement.
   * dx/dy are the actually-applied deltas (post-collision), in pixels.
   */
  syncAnimation(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      this.sprite.anims.stop();
      this.setIdleFrame();
      return;
    }

    const newDirection: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? 'left'
          : 'right'
        : dy < 0
          ? 'up'
          : 'down';

    if (newDirection !== this.direction) {
      this.direction = newDirection;
    }

    const key = `walk-${this.direction}`;
    if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) {
      this.sprite.play(key);
    }
  }

  private setIdleFrame(): void {
    this.sprite.setFrame(ROW_FOR_DIRECTION[this.direction] * FRAMES_PER_DIRECTION);
  }
}
