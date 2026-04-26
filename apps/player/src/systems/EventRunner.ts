import type { EventPage, GameMap, MapEvent } from '@srb/types';
import { evaluateCondition, type RuntimeStores } from './stores';

/**
 * Lookup helpers for the event system. Command execution itself lives in
 * PlayScene because some commands (show_text) need to block the update loop
 * while waiting for user input.
 */

/** Returns the event whose tile matches (tileX, tileY), or null. */
export function findEventAt(map: GameMap, tileX: number, tileY: number): MapEvent | null {
  return map.events.find((e) => e.x === tileX && e.y === tileY) ?? null;
}

/**
 * Picks the active page of an event by evaluating each page's conditions
 * top-to-bottom (RPG-Maker convention). All conditions on a page must pass
 * for it to be active. The first matching page wins; if none match, returns
 * null and the event is inert on this tick.
 *
 * Pages with an empty conditions list are always-active and act as the
 * default fallback when placed last.
 */
export function getActivePage(
  event: MapEvent,
  stores: RuntimeStores | null,
  mapId: string,
): EventPage | null {
  for (const page of event.pages) {
    if (pageMatches(page, stores, mapId, event.id)) return page;
  }
  return null;
}

function pageMatches(
  page: EventPage,
  stores: RuntimeStores | null,
  mapId: string,
  eventId: string,
): boolean {
  if (page.conditions.length === 0) return true;
  if (!stores) return page.conditions.every((c) => c.type === 'item_owned');
  return page.conditions.every((cond) => evaluateCondition(cond, stores, { mapId, eventId }));
}
