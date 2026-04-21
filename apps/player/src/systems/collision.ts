import type { GameMap } from '@srb/types';
import { TILE_SIZE } from '../rendering/MapRenderer';

/**
 * Checks whether a feet-position (x, y) — bottom-center of the sprite —
 * would intersect any blocking tile. The footprint rectangle size is
 * supplied by the character sheet so boss/gobelin/squirrel can each
 * have their own collision shape, independently of their visual size.
 */
export function isFeetBlocked(
  map: GameMap,
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
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
    const row = map.collision[ty];
    if (row?.[tx]) return true;
  }
  return false;
}
