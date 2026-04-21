/**
 * Character sheet data model.
 *
 * Each playable character, NPC, enemy or boss is described by a JSON file that
 * points to its sprite sheet and declares its animations and collision footprint.
 *
 * The runtime does not assume any fixed frame size or layout — Ash (32×48) and
 * a giant boss (96×128) share the same loading and animation code; only their
 * JSON descriptors differ.
 */

/** One animation = an ordered list of frame indices into the sprite sheet. */
export interface AnimationDef {
  /** Frame indices (0-based, row-major). */
  frames: number[];
  /** Playback speed in frames per second. */
  frameRate: number;
  /** -1 = loop forever, 0 = play once, N = repeat N extra times. */
  repeat: number;
  /** When true, animation plays back and forth (forward then reverse). */
  yoyo?: boolean;
}

/** Physical collision footprint at the feet, decoupled from visual sprite size. */
export interface CharacterFootprint {
  /** Width in pixels of the collision rectangle. */
  width: number;
  /** Height in pixels of the collision rectangle. */
  height: number;
}

/** Frame index to display when no animation is playing, per facing direction. */
export interface CharacterIdleFrames {
  down: number;
  left: number;
  right: number;
  up: number;
}

/**
 * Reserved animation keys the engine looks for by convention.
 *
 * - `walk-<dir>` — required for any character that moves on a map.
 * - `idle-<dir>` — optional; if absent, the engine shows `idleFrames[dir]`.
 * - `attack-<dir>`, `cast-<dir>`, `hurt`, `death`, etc. — optional, triggered
 *   explicitly by gameplay systems (combat, story events).
 */
export type StandardAnimationKey =
  | `walk-${'down' | 'left' | 'right' | 'up'}`
  | `idle-${'down' | 'left' | 'right' | 'up'}`
  | `attack-${'down' | 'left' | 'right' | 'up'}`
  | `cast-${'down' | 'left' | 'right' | 'up'}`
  | 'hurt'
  | 'death';

/** A character sheet — loaded from `/assets/characters/<id>.json`. */
export interface CharacterSheet {
  /** Stable identifier; used as Phaser texture key. */
  id: string;
  /** Display name (e.g. "Ash", "Goblin scout", "Fire Dragon"). */
  name: string;
  /** Public URL of the sprite sheet image. */
  imagePath: string;
  /** Single-frame pixel dimensions. */
  frameWidth: number;
  frameHeight: number;
  /** Sprite origin (anchor). (0.5, 1) = bottom-center, feet on tile. */
  originX: number;
  originY: number;
  /** Collision footprint (in pixels). */
  footprint: CharacterFootprint;
  /** Frame to display when idle, per direction. */
  idleFrames: CharacterIdleFrames;
  /** Keyed by animation name. Keys can be StandardAnimationKey or custom. */
  animations: Record<string, AnimationDef>;
  /**
   * Optional color tint applied to the sprite as 0xRRGGBB. Useful for quick
   * palette-swap NPCs sharing a sprite sheet image with another character.
   */
  tint?: number;
}
