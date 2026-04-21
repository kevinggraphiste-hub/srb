import type { CollisionGrid } from '@srb/types';
import { TILE_SIZE } from '../rendering/MapRenderer';

/**
 * Checks whether a feet-position (x, y) — bottom-center of the sprite —
 * would intersect any blocking tile. The footprint rectangle size is
 * supplied by the character sheet so boss/goblin/squirrel can each have
 * their own collision shape, independently of their visual size.
 *
 * Takes a CollisionGrid rather than a GameMap so PlayScene can merge the
 * map's static collision with dynamic obstacles (NPCs, chests…).
 */
export function isFeetBlocked(
  collision: CollisionGrid,
  mapWidth: number,
  mapHeight: number,
  x: number,
  y: number,
  footprintWidth: number,
  footprintHeight: number,
): boolean {
  const halfW = footprintWidth / 2;
  const top = y - footprintHeight;
  const bottom = y - 1;
  const left = x - halfW;
  const right = x + halfW - 1;

  const corners: Array<[number, number]> = [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ];

  for (const [cx, cy] of corners) {
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) return true;
    const row = collision[ty];
    if (row?.[tx]) return true;
  }
  return false;
}
