/**
 * Placeholder tile registry — maps tile IDs to solid colors.
 * Shared between the runtime (`apps/player`) and the editor (`apps/editor`)
 * so a tile painted in the editor looks exactly like it renders in-game.
 *
 * Will be replaced in Phase 2 once real tileset images are supported.
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

  // objects — natural
  10: { color: 0x1f4a1f, label: 'tree' },
  11: { color: 0x555555, label: 'rock' },

  // detail
  20: { color: 0xf2c94c, label: 'flower' },

  // built — house
  30: { color: 0xc9a97a, label: 'wooden_floor' },
  31: { color: 0x6e5c44, label: 'wall' },
  32: { color: 0x8a3a3a, label: 'roof' },
  33: { color: 0x4a3420, label: 'door' },
};

export function getTileDef(tileId: number): TileDef | null {
  if (tileId < 0) return null;
  return TILE_REGISTRY[tileId] ?? null;
}
