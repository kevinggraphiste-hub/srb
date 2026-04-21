import type * as Phaser from 'phaser';
import type { CharacterSheet } from '@srb/types';

export type Direction = 'down' | 'left' | 'right' | 'up';

/**
 * A character on a map — wraps a Phaser sprite, its CharacterSheet and its
 * facing direction. Size, animations and collision footprint all come from
 * the sheet, so the same class handles Ash, a boss, an NPC or an enemy.
 */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly sheet: CharacterSheet;
  private direction: Direction = 'down';

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: CharacterSheet) {
    this.sheet = sheet;
    this.sprite = scene.add.sprite(x, y, sheet.id, sheet.idleFrames[this.direction]);
    this.sprite.setOrigin(sheet.originX, sheet.originY);
    if (sheet.tint !== undefined) {
      this.sprite.setTint(sheet.tint);
    }
    Player.ensureAnims(scene, sheet);
  }

  /** Current facing direction — used by gameplay systems (e.g. action trigger facing). */
  get facing(): Direction {
    return this.direction;
  }

  /** Registers all animations from the sheet into the scene's anim manager (idempotent). */
  static ensureAnims(scene: Phaser.Scene, sheet: CharacterSheet): void {
    for (const [animName, def] of Object.entries(sheet.animations)) {
      const key = `${sheet.id}:${animName}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: def.frames.map((frame) => ({ key: sheet.id, frame })),
        frameRate: def.frameRate,
        repeat: def.repeat,
        yoyo: def.yoyo ?? false,
      });
    }
  }

  /** Updates facing direction and walk animation from the actually-applied delta. */
  syncMovement(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      this.sprite.anims.stop();
      this.setIdleFrame();
      return;
    }

    const newDirection: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.direction = newDirection;

    const animName = `walk-${this.direction}`;
    if (!this.sheet.animations[animName]) return;

    const key = `${this.sheet.id}:${animName}`;
    if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) {
      this.sprite.play(key);
    }
  }

  /**
   * Plays an arbitrary animation declared in the sheet (e.g. "attack-down",
   * "hurt", "cast-left"). Returns false if the sheet doesn't define it.
   * Used by gameplay systems (combat, events) to override the walk animation.
   */
  playAnimation(animName: string): boolean {
    if (!this.sheet.animations[animName]) return false;
    this.sprite.play(`${this.sheet.id}:${animName}`);
    return true;
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

  get footprintWidth(): number {
    return this.sheet.footprint.width;
  }
  get footprintHeight(): number {
    return this.sheet.footprint.height;
  }

  private setIdleFrame(): void {
    this.sprite.setFrame(this.sheet.idleFrames[this.direction]);
  }
}
