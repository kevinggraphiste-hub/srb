import type { EventCommand, EventPage, GameMap, MapEvent } from '@srb/types';

/**
 * Minimal event system for Phase 1 — enough to trigger transfers on contact.
 * Page selection ignores conditions for now (picks the first page); switches
 * and variables land with the dialog/branch commands in Phase 3.
 */

/** Returns the event whose tile matches (tileX, tileY), or null. */
export function findEventAt(map: GameMap, tileX: number, tileY: number): MapEvent | null {
  return map.events.find((e) => e.x === tileX && e.y === tileY) ?? null;
}

/** Picks the active page of an event. Phase 1: just the first one. */
export function getActivePage(event: MapEvent): EventPage | null {
  return event.pages[0] ?? null;
}

/** Context provided to command handlers. Keeps EventRunner decoupled from PlayScene. */
export interface EventContext {
  /** Handler called by the `transfer` command. */
  onTransfer: (mapId: string, tileX: number, tileY: number) => void;
}

/**
 * Executes event commands sequentially. Stops at the first command that
 * changes the map (transfer) — remaining commands are meant for the
 * destination map's context.
 */
export function runCommands(commands: EventCommand[], ctx: EventContext): void {
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'transfer':
        ctx.onTransfer(cmd.mapId, cmd.x, cmd.y);
        return;
      case 'show_text':
        // Phase 3 will wire this to a dialog box.
        console.log('[event:show_text]', cmd.text);
        break;
      case 'script':
        // Phase 8 will sandbox this (QuickJS / Web Worker).
        console.warn('[event:script] not yet implemented');
        break;
      case 'placeholder':
        break;
    }
  }
}
