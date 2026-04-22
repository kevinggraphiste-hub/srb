import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
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
  onMapChange: (next: GameMap) => void;
  onStrokeBegin: () => void;
  onStrokeEnd: () => void;
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
  onMapChange,
  onStrokeBegin,
  onStrokeEnd,
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
    onMapChange,
    onStrokeBegin,
    onStrokeEnd,
  });
  latestRef.current = {
    map,
    activeLayer,
    hiddenLayers,
    selectedTileId,
    activeTool,
    showCollision,
    onMapChange,
    onStrokeBegin,
    onStrokeEnd,
  };

  // State that lives across pointer events within one stroke.
  const strokeRef = useRef<{ startX: number; startY: number; mapAtStart: GameMap } | null>(null);

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
          onPointerDown: (tileX: number, tileY: number) => {
            const cur = latestRef.current;
            cur.onStrokeBegin();
            strokeRef.current = { startX: tileX, startY: tileY, mapAtStart: cur.map };

            if (cur.activeTool === 'rect') {
              // rect: wait for pointerup. Show a preview marker right away.
              sceneRef.current?.setPreviewRect({ x0: tileX, y0: tileY, x1: tileX, y1: tileY });
              return;
            }
            if (cur.activeTool === 'fill') {
              const next = applyFloodFill(cur.map, cur.activeLayer, tileX, tileY, cur.selectedTileId);
              if (next !== cur.map) cur.onMapChange(next);
              return;
            }
            // stamp/eraser: paint the start tile immediately.
            const tileIdToPaint = cur.activeTool === 'eraser' ? -1 : cur.selectedTileId;
            const painted = applyTile(cur.map, cur.activeLayer, tileIdToPaint, tileX, tileY);
            if (painted !== cur.map) cur.onMapChange(painted);
          },
          onPointerDrag: (tileX: number, tileY: number) => {
            const cur = latestRef.current;
            const stroke = strokeRef.current;
            if (!stroke) return;

            if (cur.activeTool === 'rect') {
              sceneRef.current?.setPreviewRect({
                x0: stroke.startX,
                y0: stroke.startY,
                x1: tileX,
                y1: tileY,
              });
              return;
            }
            if (cur.activeTool === 'fill') return;
            const tileIdToPaint = cur.activeTool === 'eraser' ? -1 : cur.selectedTileId;
            const painted = applyTile(cur.map, cur.activeLayer, tileIdToPaint, tileX, tileY);
            if (painted !== cur.map) cur.onMapChange(painted);
          },
          onPointerUp: (tileX: number, tileY: number) => {
            const cur = latestRef.current;
            const stroke = strokeRef.current;
            strokeRef.current = null;
            sceneRef.current?.setPreviewRect(null);

            if (!stroke) return;
            if (cur.activeTool === 'rect') {
              const tileIdToPaint = cur.selectedTileId;
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
          },
        },
      });
      const sceneInstance = game.scene.add('EditorScene', EditorScene, true) as EditorScene;
      sceneRef.current = sceneInstance;
      sceneInstance.setShowCollision(latestRef.current.showCollision);
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
  }, [activeTool]);

  useEffect(() => {
    sceneRef.current?.setHiddenLayers(hiddenLayers);
  }, [hiddenLayers]);

  useEffect(() => {
    // Force the collision overlay on when the user is actively editing collision,
    // even if the global toggle is off — otherwise paint does nothing visible.
    sceneRef.current?.setShowCollision(showCollision || activeLayer === 'collision');
  }, [showCollision, activeLayer]);

  return <div id="map-canvas" ref={containerRef} />;
}

function toolToHover(tool: Tool): HoverStyle {
  return tool;
}

function applyTile(
  map: GameMap,
  layer: EditableLayer,
  tileId: number,
  tileX: number,
  tileY: number,
): GameMap {
  if (layer === 'collision') {
    // In collision mode, "paint" = blocking, "erase" (tileId = -1) = clear.
    const blocking = tileId !== -1;
    return setCollision(map, tileX, tileY, blocking);
  }
  const currentLayer = map.layers[layer];
  if (!currentLayer) return map;
  const currentRow = currentLayer[tileY];
  if (!currentRow) return map;
  if (currentRow[tileX] === tileId) return map;

  const nextRow = [...currentRow];
  nextRow[tileX] = tileId;
  const nextLayerGrid = currentLayer.map((r, i) => (i === tileY ? nextRow : r));

  return {
    ...map,
    layers: { ...map.layers, [layer]: nextLayerGrid },
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

  const currentLayer = map.layers[layer];
  if (!currentLayer) return map;
  const nextGrid = currentLayer.map((row, y) => {
    if (y < minY || y > maxY) return row;
    const nextRow = [...row];
    for (let x = minX; x <= maxX; x++) nextRow[x] = tileId;
    return nextRow;
  });
  return { ...map, layers: { ...map.layers, [layer]: nextGrid } };
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

  const currentLayer = map.layers[layer];
  if (!currentLayer) return map;
  const target = currentLayer[startY]?.[startX];
  if (target === undefined) return map;
  if (target === tileId) return map;
  const next = currentLayer.map((r) => [...r]);
  flood(next, startX, startY, target, tileId, map.width, map.height);
  return { ...map, layers: { ...map.layers, [layer]: next } };
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
