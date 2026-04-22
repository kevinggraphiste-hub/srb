import type { GameMap } from '@srb/types';
import { getPreviewMap } from '../preview';

/**
 * Resolves a map by id. If the player is running in preview mode and
 * the project contains that map, return it directly. Otherwise fall
 * back to the static /maps/<id>.json endpoint.
 */
export async function loadMap(mapId: string): Promise<GameMap> {
  const fromPreview = getPreviewMap(mapId);
  if (fromPreview) return fromPreview;

  const response = await fetch(`/maps/${mapId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load map "${mapId}": ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as GameMap;
}
