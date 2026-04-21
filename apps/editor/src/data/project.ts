import type { GameMap, Project, ProjectFolderItem, ProjectItem } from '@srb/types';
import { getItemId, getItemOrder, getItemParentId } from '@srb/types';
import { createBlankMap, genId } from './blank-map';

/** Creates a fresh project containing a single 20×15 starting map. */
export function createBlankProject(): Project {
  const firstMap = createBlankMap(20, 15, { name: 'Map 1' });
  return {
    id: genId('project'),
    name: 'Nouveau projet',
    items: [{ type: 'map', map: firstMap }],
    activeMapId: firstMap.id,
  };
}

/** Returns the currently-edited map, or null if the project has none. */
export function getActiveMap(project: Project): GameMap | null {
  if (!project.activeMapId) return null;
  for (const item of project.items) {
    if (item.type === 'map' && item.map.id === project.activeMapId) {
      return item.map;
    }
  }
  return null;
}

/** Immutably replaces the active map's data. */
export function replaceActiveMap(project: Project, newMap: GameMap): Project {
  if (!project.activeMapId) return project;
  return {
    ...project,
    items: project.items.map((item) => {
      if (item.type === 'map' && item.map.id === project.activeMapId) {
        return { ...item, map: newMap };
      }
      return item;
    }),
  };
}

/** Adds a new map to the project and makes it the active one. */
export function addMapToProject(project: Project, map: GameMap, parentId?: string): Project {
  const nextOrder = nextSiblingOrder(project.items, parentId);
  const newMap: GameMap = { ...map, parentId, order: nextOrder };
  return {
    ...project,
    items: [...project.items, { type: 'map', map: newMap }],
    activeMapId: newMap.id,
  };
}

/** Adds a new folder to the project. */
export function addFolderToProject(project: Project, name: string, parentId?: string): Project {
  const folder: ProjectFolderItem = {
    type: 'folder',
    id: genId('folder'),
    name,
    parentId,
    order: nextSiblingOrder(project.items, parentId),
  };
  return {
    ...project,
    items: [...project.items, folder],
  };
}

function nextSiblingOrder(items: ProjectItem[], parentId: string | undefined): number {
  const siblings = items.filter((i) => getItemParentId(i) === parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map(getItemOrder)) + 1;
}

/** Sets the active map id after validating it exists. */
export function setActiveMapId(project: Project, mapId: string): Project {
  const exists = project.items.some((item) => item.type === 'map' && item.map.id === mapId);
  if (!exists) return project;
  return { ...project, activeMapId: mapId };
}

/** Renames a map or folder (immutable). */
export function renameItem(project: Project, itemId: string, newName: string): Project {
  return {
    ...project,
    items: project.items.map((item) => {
      if (getItemId(item) !== itemId) return item;
      if (item.type === 'folder') return { ...item, name: newName };
      return { ...item, map: { ...item.map, name: newName } };
    }),
  };
}

/** Returns ids of `itemId` and all its descendants. */
export function collectDescendants(items: ProjectItem[], itemId: string): Set<string> {
  const out = new Set<string>([itemId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      const parent = getItemParentId(item);
      const self = getItemId(item);
      if (parent && out.has(parent) && !out.has(self)) {
        out.add(self);
        changed = true;
      }
    }
  }
  return out;
}

/**
 * Deletes an item and all its descendants. If the active map was in the
 * deleted subtree, activeMapId falls back to the first remaining map, or null.
 */
export function deleteItem(project: Project, itemId: string): Project {
  const toDelete = collectDescendants(project.items, itemId);
  const nextItems = project.items.filter((i) => !toDelete.has(getItemId(i)));
  let nextActive: string | null = project.activeMapId;
  if (nextActive && toDelete.has(nextActive)) {
    const firstMap = nextItems.find(
      (i): i is Extract<ProjectItem, { type: 'map' }> => i.type === 'map',
    );
    nextActive = firstMap ? firstMap.map.id : null;
  }
  return { ...project, items: nextItems, activeMapId: nextActive };
}

/**
 * Moves an item under a new parent. No-op if the move would create a cycle
 * (target is inside the moved subtree). Reorders the source as the last child.
 */
export function moveItem(project: Project, sourceId: string, newParentId?: string): Project {
  if (sourceId === newParentId) return project;
  if (newParentId) {
    const cycle = collectDescendants(project.items, sourceId);
    if (cycle.has(newParentId)) return project;
  }
  const nextOrder = nextSiblingOrder(
    project.items.filter((i) => getItemId(i) !== sourceId),
    newParentId,
  );
  return {
    ...project,
    items: project.items.map((item) => {
      if (getItemId(item) !== sourceId) return item;
      if (item.type === 'folder') {
        return { ...item, parentId: newParentId, order: nextOrder };
      }
      return { ...item, map: { ...item.map, parentId: newParentId, order: nextOrder } };
    }),
  };
}

/** Resizes a map by cropping or padding its grids to the new dimensions. */
export function resizeMap(
  project: Project,
  mapId: string,
  newWidth: number,
  newHeight: number,
): Project {
  return {
    ...project,
    items: project.items.map((item) => {
      if (item.type !== 'map' || item.map.id !== mapId) return item;
      return { ...item, map: resizeMapGrids(item.map, newWidth, newHeight) };
    }),
  };
}

function resizeMapGrids(map: GameMap, w: number, h: number): GameMap {
  const resizeTileGrid = (grid: number[][] | undefined, fill: number): number[][] | undefined => {
    if (!grid) return grid;
    const out: number[][] = [];
    for (let y = 0; y < h; y++) {
      const src = grid[y];
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        row.push(src?.[x] ?? fill);
      }
      out.push(row);
    }
    return out;
  };
  const resizeCollisionGrid = (grid: boolean[][]): boolean[][] => {
    const out: boolean[][] = [];
    for (let y = 0; y < h; y++) {
      const src = grid[y];
      const row: boolean[] = [];
      for (let x = 0; x < w; x++) {
        row.push(src?.[x] ?? false);
      }
      out.push(row);
    }
    return out;
  };
  return {
    ...map,
    width: w,
    height: h,
    layers: {
      background: resizeTileGrid(map.layers.background, -1),
      ground: resizeTileGrid(map.layers.ground, 0) as number[][],
      detail: resizeTileGrid(map.layers.detail, -1),
      objects: resizeTileGrid(map.layers.objects, -1),
      overlay: resizeTileGrid(map.layers.overlay, -1),
    },
    collision: resizeCollisionGrid(map.collision),
    events: map.events.filter((e) => e.x < w && e.y < h),
  };
}

export { getItemId };
