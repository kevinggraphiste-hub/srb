import type { GameMap } from '@srb/types';

/**
 * Fetches a GameMap JSON from the static /maps folder.
 * No runtime validation yet — that arrives with @srb/schemas (Zod) in Phase 2.
 */
export async function loadMap(mapId: string): Promise<GameMap> {
  const response = await fetch(`/maps/${mapId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load map "${mapId}": ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as GameMap;
}
