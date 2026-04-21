/**
 * Map data model for SRB.
 *
 * See memory "SRB — modèle de données Map" for the reasoning behind
 * the 5-layer split, the events-as-separate-list choice, and the
 * parent/child map hierarchy.
 */

/** Integer tile index into a tileset. -1 means empty. */
export type TileIndex = number;

/** Grid of tile indices for one visual layer (row-major: tiles[y][x]). */
export type TileGrid = TileIndex[][];

/** Grid of booleans for the collision layer (true = blocking). */
export type CollisionGrid = boolean[][];

/**
 * Render layers, rendered in this order from back to front.
 * All grids are width×height of the map.
 */
export interface MapLayers {
  /** Far background, optional parallax (sky, distant mountains). */
  background?: TileGrid;
  /** Ground tiles (grass, dirt, water, tiles). */
  ground: TileGrid;
  /** Non-blocking ground decorations (flowers, tall grass). */
  detail?: TileGrid;
  /** Tile-occupying objects (trees, rocks, furniture). Usually blocking. */
  objects?: TileGrid;
  /** Tiles rendered above the player (roofs, treetops). */
  overlay?: TileGrid;
}

/** Trigger that fires an event page. */
export type EventTrigger = 'action' | 'contact' | 'auto' | 'parallel';

/** Movement pattern for an NPC event between triggers. */
export type MovementPattern =
  | { type: 'fixed' }
  | { type: 'random' }
  | { type: 'approach' } // walks toward player when visible
  | { type: 'custom'; route: MovementStep[] };

export type MovementStep =
  | { type: 'move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'wait'; ms: number }
  | { type: 'turn'; direction: 'up' | 'down' | 'left' | 'right' };

/** Condition under which an event page becomes active. */
export type EventCondition =
  | { type: 'switch'; id: string; value: boolean }
  | { type: 'variable'; id: string; op: '=' | '>=' | '<=' | '>' | '<'; value: number }
  | { type: 'self_switch'; id: 'A' | 'B' | 'C' | 'D'; value: boolean }
  | { type: 'item_owned'; itemId: string };

/** A single page within an event. Pages are evaluated top-to-bottom; first matching page runs. */
export interface EventPage {
  conditions: EventCondition[]; // empty = always active
  trigger: EventTrigger;
  graphic: {
    spriteId: string | null; // null = invisible event
    direction: 'up' | 'down' | 'left' | 'right';
    frame: number;
  };
  movement: MovementPattern;
  /** Event command list — see docs/specs/event-commands.md (to come in Phase 3). */
  commands: EventCommand[];
}

/**
 * Event command placeholder. Will be expanded in Phase 3 to cover the full
 * RPG-Maker-style command set (show_text, choice, transfer, conditional, etc.).
 */
export type EventCommand =
  | { type: 'show_text'; text: string }
  | { type: 'transfer'; mapId: string; x: number; y: number }
  | { type: 'script'; code: string }
  | { type: 'placeholder' };

/**
 * A map event is anchored to a tile coordinate and has one or more pages.
 * Multiple events can share the same tile.
 */
export interface MapEvent {
  id: string;
  name: string;
  x: number; // tile x
  y: number; // tile y
  pages: EventPage[];
}

/** A map in an SRB project. */
export interface GameMap {
  id: string;
  name: string;
  /** Parent map in the project tree (e.g. an inner room's parent is the house). */
  parentId?: string;
  /** Sort order among siblings. */
  order: number;
  /** Width and height in tiles. Varies per map (interior 10×10, city 50×50, etc.). */
  width: number;
  height: number;
  /** Asset ID of the tileset referenced by layer grids. */
  tilesetId: string;
  layers: MapLayers;
  collision: CollisionGrid;
  events: MapEvent[];
  /**
   * Default spawn tile when the map is entered without an explicit spawn
   * (e.g. the very first map of the game). If absent, the engine falls
   * back to the map center.
   */
  defaultSpawnTile?: { x: number; y: number };
  /** Optional background music (asset ID). */
  bgm?: string;
}
