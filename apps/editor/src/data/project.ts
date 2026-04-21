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

export { getItemId };
