import type { EventPage, GameMap, MapEvent } from '@srb/types';

/**
 * Lookup helpers for the event system. Command execution itself lives in
 * PlayScene because some commands (show_text) need to block the update loop
 * while waiting for user input.
 */

/** Returns the event whose tile matches (tileX, tileY), or null. */
export function findEventAt(map: GameMap, tileX: number, tileY: number): MapEvent | null {
  return map.events.find((e) => e.x === tileX && e.y === tileY) ?? null;
}

/** Picks the active page of an event. Phase 1: just the first one. */
export function getActivePage(event: MapEvent): EventPage | null {
  return event.pages[0] ?? null;
}
