import type { GameMap, TileGrid, CollisionGrid } from '@srb/types';

function grid<T>(width: number, height: number, fill: T): T[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

/** Browser-safe short id. Available on localhost + https. */
export function genId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `${prefix}-${uuid.slice(0, 8)}`;
}

interface CreateBlankMapOptions {
  name?: string;
  parentId?: string;
  order?: number;
}

/** Builds a default all-grass map, ready to edit. */
export function createBlankMap(
  width: number,
  height: number,
  options: CreateBlankMapOptions = {},
): GameMap {
  const ground: TileGrid = grid(width, height, 0);
  const collision: CollisionGrid = grid(width, height, false);
  return {
    id: genId('map'),
    name: options.name ?? 'Nouvelle map',
    parentId: options.parentId,
    order: options.order ?? 0,
    width,
    height,
    tilesetId: 'placeholder',
    layers: {
      ground,
      detail: grid(width, height, -1),
      objects: grid(width, height, -1),
    },
    collision,
    events: [],
  };
}
