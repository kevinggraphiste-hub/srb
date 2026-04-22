import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
import { EditorScene, EDITOR_DATA_REGISTRY_KEY, TILE_SIZE } from '../phaser/EditorScene';
import type { EditableLayer, RenderableLayer } from './LayerSelect';
import type { Tool } from './ToolSelect';

interface MapCanvasProps {
  map: GameMap;
  activeLayer: EditableLayer;
  hiddenLayers: Set<RenderableLayer>;
  selectedTileId: number;
  activeTool: Tool;
  onMapChange: (next: GameMap) => void;
}

/**
 * React wrapper around a Phaser.Game that runs the EditorScene.
 * The scene is registered after Phaser's READY event so initial `init()`
 * receives the current map and paint callback (otherwise Phaser boots the
 * scene before the React data is available → this.map is undefined).
 */
export function MapCanvas({
  map,
  activeLayer,
  hiddenLayers,
  selectedTileId,
  activeTool,
  onMapChange,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EditorScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // Always read the freshest state inside the Phaser callback.
  const latestRef = useRef({
    map,
    activeLayer,
    hiddenLayers,
    selectedTileId,
    activeTool,
    onMapChange,
  });
  latestRef.current = {
    map,
    activeLayer,
    hiddenLayers,
    selectedTileId,
    activeTool,
    onMapChange,
  };

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
        onPaint: (tileX: number, tileY: number) => {
          const current = latestRef.current;
          const tileIdToPaint = current.activeTool === 'eraser' ? -1 : current.selectedTileId;
          const next = paintTile(current.map, current.activeLayer, tileIdToPaint, tileX, tileY);
          if (next !== current.map) {
            current.onMapChange(next);
          }
        },
      });
      const sceneInstance = game.scene.add('EditorScene', EditorScene, true) as EditorScene;
      sceneRef.current = sceneInstance;
    });

    return (): void => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // Push map changes to the running scene without recreating Phaser.
  useEffect(() => {
    sceneRef.current?.refresh(map);
  }, [map]);

  useEffect(() => {
    sceneRef.current?.setHoverStyle(activeTool);
  }, [activeTool]);

  useEffect(() => {
    sceneRef.current?.setHiddenLayers(hiddenLayers);
  }, [hiddenLayers]);

  return <div id="map-canvas" ref={containerRef} />;
}

/**
 * Returns a new GameMap with one tile updated on the given layer.
 * No-ops and returns the input if the tile already has that value.
 */
function paintTile(
  map: GameMap,
  layer: EditableLayer,
  tileId: number,
  tileX: number,
  tileY: number,
): GameMap {
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
    layers: {
      ...map.layers,
      [layer]: nextLayerGrid,
    },
  };
}
