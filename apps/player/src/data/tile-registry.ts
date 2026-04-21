/**
 * Placeholder tile registry — maps tile IDs to solid colors.
 * Will be replaced in Phase 2 when real tileset images are introduced.
 */

export interface TileDef {
  color: number;
  label: string;
}

export const TILE_REGISTRY: Record<number, TileDef> = {
  // ground
  0: { color: 0x4a7c3c, label: 'grass' },
  1: { color: 0x8b6f3a, label: 'dirt' },
  2: { color: 0x2e5d8f, label: 'water' },

  // objects
  10: { color: 0x1f4a1f, label: 'tree' },
  11: { color: 0x555555, label: 'rock' },

  // detail
  20: { color: 0xf2c94c, label: 'flower' },
};

export function getTileDef(tileId: number): TileDef | null {
  if (tileId < 0) return null;
  return TILE_REGISTRY[tileId] ?? null;
}
