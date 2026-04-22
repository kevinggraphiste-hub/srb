import type { EventPage, GameMap, MapEvent } from '@srb/types';
import { genId } from './blank-map';

export function createBlankEventPage(): EventPage {
  return {
    conditions: [],
    trigger: 'action',
    graphic: { spriteId: null, direction: 'down', frame: 0 },
    movement: { type: 'fixed' },
    commands: [],
  };
}

export function createBlankEvent(x: number, y: number, name?: string): MapEvent {
  return {
    id: genId('event'),
    name: name ?? `Event ${x},${y}`,
    x,
    y,
    pages: [createBlankEventPage()],
  };
}

export function addEventToMap(map: GameMap, event: MapEvent): GameMap {
  return { ...map, events: [...map.events, event] };
}

export function replaceEventInMap(map: GameMap, eventId: string, next: MapEvent): GameMap {
  return {
    ...map,
    events: map.events.map((e) => (e.id === eventId ? next : e)),
  };
}

export function deleteEventFromMap(map: GameMap, eventId: string): GameMap {
  return { ...map, events: map.events.filter((e) => e.id !== eventId) };
}

export function findEventAt(map: GameMap, x: number, y: number): MapEvent | null {
  for (const e of map.events) {
    if (e.x === x && e.y === y) return e;
  }
  return null;
}

export function findEventById(map: GameMap, eventId: string): MapEvent | null {
  for (const e of map.events) {
    if (e.id === eventId) return e;
  }
  return null;
}
