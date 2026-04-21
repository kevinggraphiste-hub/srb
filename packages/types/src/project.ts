import type { GameMap } from './map';

/**
 * A project is the top-level container for an SRB creation: a tree of maps
 * and folders. Folders exist only to organize maps visually in the editor
 * (e.g. grouping the rooms of a dungeon). Parent links also work between
 * two maps — a house map can be the parent of its interior rooms.
 */

export interface ProjectFolderItem {
  type: 'folder';
  id: string;
  name: string;
  parentId?: string;
  /** Sort order among siblings. */
  order: number;
}

export interface ProjectMapItem {
  type: 'map';
  map: GameMap;
}

export type ProjectItem = ProjectMapItem | ProjectFolderItem;

/** Stable id of any project item. */
export function getItemId(item: ProjectItem): string {
  return item.type === 'folder' ? item.id : item.map.id;
}

/** Display name of any project item. */
export function getItemName(item: ProjectItem): string {
  return item.type === 'folder' ? item.name : item.map.name;
}

/** Parent id of any project item (undefined = root level). */
export function getItemParentId(item: ProjectItem): string | undefined {
  return item.type === 'folder' ? item.parentId : item.map.parentId;
}

/** Sort order among siblings. */
export function getItemOrder(item: ProjectItem): number {
  return item.type === 'folder' ? item.order : item.map.order;
}

export interface Project {
  id: string;
  name: string;
  items: ProjectItem[];
  /** The map currently being edited. Null if the project has no maps. */
  activeMapId: string | null;
}
