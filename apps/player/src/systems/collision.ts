import type { GameMap } from '@srb/types';
import { TILE_SIZE } from '../rendering/MapRenderer';

/** Small footprint at the feet — narrower than the sprite to feel natural. */
const FOOTPRINT_WIDTH = TILE_SIZE - 4;
const FOOTPRINT_HEIGHT = 6;

/**
 * Checks whether a feet-position (x, y) — where y is the bottom of the sprite —
 * would intersect any blocking tile. Tests the 4 corners of a narrow footprint
 * rectangle centered on the feet, plus handles map bounds.
 */
export function isFeetBlocked(map: GameMap, x: number, y: number): boolean {
  const halfW = FOOTPRINT_WIDTH / 2;
  const top = y - FOOTPRINT_HEIGHT;
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
