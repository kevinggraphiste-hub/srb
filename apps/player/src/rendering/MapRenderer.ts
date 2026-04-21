import type * as Phaser from 'phaser';
import type { GameMap, TileGrid } from '@srb/types';
import { getTileDef } from '@srb/engine';

export const TILE_SIZE = 32;

/**
 * Draws background/ground/detail/objects as a single Graphics object.
 * One draw call for all tiles beats rendering hundreds of individual
 * rectangles. The overlay is drawn separately so the player can be
 * inserted between — overlay tiles render above the player.
 */
export function renderMapBase(scene: Phaser.Scene, map: GameMap): Phaser.GameObjects.Graphics {
  const baseLayers: Array<TileGrid | undefined> = [
    map.layers.background,
    map.layers.ground,
    map.layers.detail,
    map.layers.objects,
  ];
  const graphics = scene.add.graphics();
  for (const grid of baseLayers) {
    if (grid) drawLayer(graphics, grid, map.width, map.height);
  }
  return graphics;
}

export function renderMapOverlay(
  scene: Phaser.Scene,
  map: GameMap,
): Phaser.GameObjects.Graphics | null {
  const overlay = map.layers.overlay;
  if (!overlay) return null;
  const graphics = scene.add.graphics();
  drawLayer(graphics, overlay, map.width, map.height);
  return graphics;
}

function drawLayer(
  graphics: Phaser.GameObjects.Graphics,
  grid: TileGrid,
  width: number,
  height: number,
): void {
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < width; x++) {
      const tileId = row[x];
      if (tileId === undefined) continue;
      const def = getTileDef(tileId);
      if (!def) continue;
      graphics.fillStyle(def.color, 1);
      graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}
