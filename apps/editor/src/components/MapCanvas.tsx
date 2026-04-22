import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import type { GameMap, TileGrid } from '@srb/types';
import {
  EditorScene,
  EDITOR_DATA_REGISTRY_KEY,
  TILE_SIZE,
  type HoverStyle,
} from '../phaser/EditorScene';
import type { EditableLayer, RenderableLayer } from './LayerSelect';
import type { Tool } from './ToolSelect';

interface MapCanvasProps {
  map: GameMap;
  activeLayer: EditableLayer;
  hiddenLayers: Set<RenderableLayer>;
  selectedTileId: number;
  activeTool: Tool;
  showCollision: boolean;
  selectedEventId: string | null;
  onMapChange: (next: GameMap) => void;
  onStrokeBegin: () => void;
  onStrokeEnd: () => void;
  onEventToolClick: (tileX: number, tileY: number) => void;
}

/**
 * Bridge between the Phaser editor scene and React state.
 * The scene emits raw pointer events; this component translates them into
 * map mutations based on the current tool, layer, and selection.
 */
export function MapCanvas({
  map,
  activeLayer,
  hiddenLayers,
  selectedTileId,
  activeTool,
  showCollision,
  selectedEventId,
  onMapChange,
  onStrokeBegin,
  onStrokeEnd,
  onEventToolClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EditorScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const latestRef = useRef({
    map,
    activeLayer,
    hiddenLayers,
    selectedTileId,
    activeTool,
    showCollision,
    selectedEventId,
    onMapChange,
    onStrokeBegin,
    onStrokeEnd,
    onEventToolClick,
  });
  latestRef.current = {
    map,
    activeLayer,
    hiddenLayers,
    selectedTileId,
    activeTool,
    showCollision,
    selectedEventId,
    onMapChange,
    onStrokeBegin,
    onStrokeEnd,
    onEventToolClick,
  };

  // State that lives across pointer events within one stroke.
  const strokeRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    mapAtStart: GameMap;
    mode: 'stamp' | 'eraser' | 'rect' | 'fill';
  } | null>(null);

  // Shared stroke-end logic. Called from Phaser's pointerup AND from a
  // document-level mouseup fallback, so releasing the mouse outside the
  // canvas still closes the rectangle and commits history.
  const finishStrokeRef = useRef<(tileX: number, tileY: number) => void>(() => undefined);

  // Build the finisher once and keep it in the ref so both Phaser and the
  // document mouseup fallback call the exact same closure.
  useEffect(() => {
    finishStrokeRef.current = (tileX: number, tileY: number): void => {
      const cur = latestRef.current;
      const stroke = strokeRef.current;
      if (!stroke) return;
      strokeRef.current = null;
      sceneRef.current?.setPreviewRect(null);

      if (stroke.mode === 'rect') {
        const tileIdToPaint = cur.activeTool === 'eraser' ? -1 : cur.selectedTileId;
        const finalMap = applyRect(
          stroke.mapAtStart,
          cur.activeLayer,
          tileIdToPaint,
          stroke.startX,
          stroke.startY,
          tileX,
          tileY,
        );
        if (finalMap !== cur.map) cur.onMapChange(finalMap);
      }
      cur.onStrokeEnd();
    };
  }, []);

  // Fallback: mouse released anywhere in the document. Phaser's pointerup
  // only fires inside the canvas, so dragging off-canvas leaves the stroke
  // dangling and the preview rect visible. This closes it.
  useEffect(() => {
    const onUp = (): void => {
      const stroke = strokeRef.current;
      if (!stroke) return;
      finishStrokeRef.current(stroke.lastX, stroke.lastY);
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: latestRef.current.map.width * TILE_SIZE,
      height: latestRef.current.map.height * TILE_SIZE,
      parent: container,
      backgroundColor: '#1a1a1a',
      pixelArt: true,
      scene: [],
    });
    gameRef.current = game;

    game.events.once(Phaser.Core.Events.READY, () => {
      game.registry.set(EDITOR_DATA_REGISTRY_KEY, {
        map: latestRef.current.map,
        hiddenLayers: latestRef.current.hiddenLayers,
        callbacks: {
          onPointerDown: (tileX: number, tileY: number, modifiers: { shift: boolean }) => {
            const cur = latestRef.current;

            // Event tool: no stroke, no paint — just select/create.
            if (cur.activeTool === 'event') {
              cur.onEventToolClick(tileX, tileY);
              return;
            }

            cur.onStrokeBegin();

            // Shift + stamp/eraser promotes the drag to rect mode. Eraser stays
            // eraser semantically (uses -1), which we thread via the stored mode.
            const promoteToRect =
              modifiers.shift &&
              (cur.activeTool === 'stamp' || cur.activeTool === 'eraser');
            const mode: 'stamp' | 'eraser' | 'rect' | 'fill' = promoteToRect
              ? 'rect'
              : (cur.activeTool as 'stamp' | 'eraser' | 'rect' | 'fill');
            strokeRef.current = {
              startX: tileX,
              startY: tileY,
              lastX: tileX,
              lastY: tileY,
              mapAtStart: cur.map,
              mode,
            };

            if (mode === 'rect') {
              sceneRef.current?.setPreviewRect({ x0: tileX, y0: tileY, x1: tileX, y1: tileY });
              return;
            }
            if (mode === 'fill') {
              const next = applyFloodFill(
                cur.map,
                cur.activeLayer,
                tileX,
                tileY,
                cur.selectedTileId,
              );
              if (next !== cur.map) cur.onMapChange(next);
              return;
            }
            // stamp/eraser: paint the start tile immediately.
            const tileIdToPaint = mode === 'eraser' ? -1 : cur.selectedTileId;
            const painted = applyTile(cur.map, cur.activeLayer, tileIdToPaint, tileX, tileY);
            if (painted !== cur.map) cur.onMapChange(painted);
          },
          onPointerDrag: (tileX: number, tileY: number) => {
            const cur = latestRef.current;
            const stroke = strokeRef.current;
            if (!stroke) return;
            stroke.lastX = tileX;
            stroke.lastY = tileY;

            if (stroke.mode === 'rect') {
              sceneRef.current?.setPreviewRect({
                x0: stroke.startX,
                y0: stroke.startY,
                x1: tileX,
                y1: tileY,
              });
              return;
            }
            if (stroke.mode === 'fill') return;
            const tileIdToPaint = stroke.mode === 'eraser' ? -1 : cur.selectedTileId;
            const painted = applyTile(cur.map, cur.activeLayer, tileIdToPaint, tileX, tileY);
            if (painted !== cur.map) cur.onMapChange(painted);
          },
          onPointerUp: (tileX: number, tileY: number) => {
            finishStrokeRef.current(tileX, tileY);
          },
        },
      });
      const sceneInstance = game.scene.add('EditorScene', EditorScene, true) as EditorScene;
      sceneRef.current = sceneInstance;
      sceneInstance.setShowCollision(latestRef.current.showCollision);
      sceneInstance.setShowEvents(latestRef.current.activeTool === 'event');
      sceneInstance.setSelectedEventId(latestRef.current.selectedEventId);
    });

    return (): void => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.refresh(map);
  }, [map]);

  useEffect(() => {
    sceneRef.current?.setHoverStyle(toolToHover(activeTool));
    sceneRef.current?.setShowEvents(activeTool === 'event');
  }, [activeTool]);

  useEffect(() => {
    sceneRef.current?.setHiddenLayers(hiddenLayers);
  }, [hiddenLayers]);

  useEffect(() => {
    // Force the collision overlay on when the user is actively editing collision,
    // even if the global toggle is off — otherwise paint does nothing visible.
    sceneRef.current?.setShowCollision(showCollision || activeLayer === 'collision');
  }, [showCollision, activeLayer]);

  useEffect(() => {
    sceneRef.current?.setSelectedEventId(selectedEventId);
  }, [selectedEventId]);

  return <div id="map-canvas" ref={containerRef} />;
}

function toolToHover(tool: Tool): HoverStyle {
  return tool;
}

/**
 * Creates an empty layer grid if the map has none. Existing projects saved
 * before background/overlay were added may not have those fields — this lets
 * the user start painting on them without a migration step.
 */
function ensureLayer(map: GameMap, layer: Exclude<EditableLayer, 'collision'>): GameMap {
  if (map.layers[layer]) return map;
  const grid: TileGrid = Array.from({ length: map.height }, () =>
    Array.from({ length: map.width }, () => -1),
  );
  return { ...map, layers: { ...map.layers, [layer]: grid } };
}

function applyTile(
  map: GameMap,
  layer: EditableLayer,
  tileId: number,
  tileX: number,
  tileY: number,
): GameMap {
  if (layer === 'collision') {
    const blocking = tileId !== -1;
    return setCollision(map, tileX, tileY, blocking);
  }
  const ensured = ensureLayer(map, layer);
  const currentLayer = ensured.layers[layer]!;
  const currentRow = currentLayer[tileY];
  if (!currentRow) return ensured;
  if (currentRow[tileX] === tileId) return ensured;

  const nextRow = [...currentRow];
  nextRow[tileX] = tileId;
  const nextLayerGrid = currentLayer.map((r, i) => (i === tileY ? nextRow : r));

  return {
    ...ensured,
    layers: { ...ensured.layers, [layer]: nextLayerGrid },
  };
}

function setCollision(map: GameMap, tileX: number, tileY: number, blocking: boolean): GameMap {
  const row = map.collision[tileY];
  if (!row) return map;
  if (row[tileX] === blocking) return map;
  const nextRow = [...row];
  nextRow[tileX] = blocking;
  return {
    ...map,
    collision: map.collision.map((r, i) => (i === tileY ? nextRow : r)),
  };
}

function applyRect(
  map: GameMap,
  layer: EditableLayer,
  tileId: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): GameMap {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  if (layer === 'collision') {
    const blocking = tileId !== -1;
    const nextCollision = map.collision.map((row, y) => {
      if (y < minY || y > maxY) return row;
      const nextRow = [...row];
      for (let x = minX; x <= maxX; x++) nextRow[x] = blocking;
      return nextRow;
    });
    return { ...map, collision: nextCollision };
  }

  const ensured = ensureLayer(map, layer);
  const currentLayer = ensured.layers[layer]!;
  const nextGrid = currentLayer.map((row, y) => {
    if (y < minY || y > maxY) return row;
    const nextRow = [...row];
    for (let x = minX; x <= maxX; x++) nextRow[x] = tileId;
    return nextRow;
  });
  return { ...ensured, layers: { ...ensured.layers, [layer]: nextGrid } };
}

function applyFloodFill(
  map: GameMap,
  layer: EditableLayer,
  startX: number,
  startY: number,
  tileId: number,
): GameMap {
  if (layer === 'collision') {
    const target = map.collision[startY]?.[startX];
    if (target === undefined) return map;
    const blocking = tileId !== -1;
    if (target === blocking) return map;
    const next = map.collision.map((r) => [...r]);
    flood(next, startX, startY, target, blocking, map.width, map.height);
    return { ...map, collision: next };
  }

  const ensured = ensureLayer(map, layer);
  const currentLayer = ensured.layers[layer]!;
  const target = currentLayer[startY]?.[startX];
  if (target === undefined) return ensured;
  if (target === tileId) return ensured;
  const next = currentLayer.map((r) => [...r]);
  flood(next, startX, startY, target, tileId, ensured.width, ensured.height);
  return { ...ensured, layers: { ...ensured.layers, [layer]: next } };
}

function flood<T>(
  grid: T[][],
  startX: number,
  startY: number,
  target: T,
  replacement: T,
  width: number,
  height: number,
): void {
  const stack: Array<[number, number]> = [[startX, startY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const row = grid[y];
    if (!row) continue;
    if (row[x] !== target) continue;
    row[x] = replacement;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
