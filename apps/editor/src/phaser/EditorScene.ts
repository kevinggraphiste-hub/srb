import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
import { getTileDef } from '@srb/engine';

export const TILE_SIZE = 32;

export type EditorLayer = 'ground' | 'detail' | 'objects';

/**
 * Editor scene: renders the map with a visible grid and emits a 'paint'
 * event when the user clicks a tile. Unlike the player's PlayScene, it
 * does not handle physics, camera follow or character sprites.
 */
/** Registry key used to pass the initial map + paint callback from React → Scene. */
export const EDITOR_DATA_REGISTRY_KEY = 'editorData';

export type RenderableLayerId = 'background' | 'ground' | 'detail' | 'objects' | 'overlay';

export interface EditorSceneData {
  map: GameMap;
  hiddenLayers: Set<RenderableLayerId>;
  onPaint: (tileX: number, tileY: number) => void;
}

export class EditorScene extends Phaser.Scene {
  private map!: GameMap;
  private hiddenLayers: Set<RenderableLayerId> = new Set();
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverRect!: Phaser.GameObjects.Rectangle;

  private onPaint: ((tileX: number, tileY: number) => void) | null = null;

  constructor() {
    super({ key: 'EditorScene' });
  }

  /** Switch the hover rectangle color between stamp (red) and eraser (gray). */
  setHoverStyle(tool: 'stamp' | 'eraser'): void {
    if (!this.hoverRect) return;
    const color = tool === 'eraser' ? 0xaaaaaa : 0xff6b6b;
    this.hoverRect.setStrokeStyle(2, color);
  }

  setHiddenLayers(hidden: Set<RenderableLayerId>): void {
    this.hiddenLayers = hidden;
    if (this.mapGraphics) this.renderMap();
  }

  create(): void {
    // Pull initial data from the game registry. Phaser 4's scene.add(_, _, true, data)
    // does not reliably forward `data` to init(), so we keep the contract
    // simple: React writes to registry before adding the scene, we read here.
    const data = this.game.registry.get(EDITOR_DATA_REGISTRY_KEY) as EditorSceneData | undefined;
    if (!data) {
      throw new Error(`EditorScene: missing registry key "${EDITOR_DATA_REGISTRY_KEY}"`);
    }
    this.map = data.map;
    this.hiddenLayers = data.hiddenLayers;
    this.onPaint = data.onPaint;

    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.mapGraphics = this.add.graphics();
    this.renderMap();

    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    this.hoverRect = this.add
      .rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.15)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xff6b6b);
    this.hoverRect.setVisible(false);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { tileX, tileY } = this.pointerToTile(pointer);
      if (this.isInBounds(tileX, tileY)) {
        this.hoverRect.setVisible(true);
        this.hoverRect.setPosition(tileX * TILE_SIZE, tileY * TILE_SIZE);
      } else {
        this.hoverRect.setVisible(false);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { tileX, tileY } = this.pointerToTile(pointer);
      if (!this.isInBounds(tileX, tileY)) return;
      this.onPaint?.(tileX, tileY);
    });
    // While dragging, paint continuously (stamp-like feel).
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const { tileX, tileY } = this.pointerToTile(pointer);
      if (!this.isInBounds(tileX, tileY)) return;
      this.onPaint?.(tileX, tileY);
    });
  }

  /** Re-renders the map from the currently assigned GameMap. Cheap enough for 100×100. */
  refresh(map: GameMap): void {
    this.map = map;
    this.renderMap();
  }

  private renderMap(): void {
    this.mapGraphics.clear();
    const layers: Array<{ id: RenderableLayerId; grid: number[][] | undefined }> = [
      { id: 'background', grid: this.map.layers.background },
      { id: 'ground', grid: this.map.layers.ground },
      { id: 'detail', grid: this.map.layers.detail },
      { id: 'objects', grid: this.map.layers.objects },
      { id: 'overlay', grid: this.map.layers.overlay },
    ];
    for (const { id, grid } of layers) {
      if (!grid) continue;
      if (this.hiddenLayers.has(id)) continue;
      for (let y = 0; y < this.map.height; y++) {
        const row = grid[y];
        if (!row) continue;
        for (let x = 0; x < this.map.width; x++) {
          const tileId = row[x];
          if (tileId === undefined) continue;
          const def = getTileDef(tileId);
          if (!def) continue;
          this.mapGraphics.fillStyle(def.color, 1);
          this.mapGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0xffffff, 0.12);
    for (let x = 0; x <= this.map.width; x++) {
      this.gridGraphics.moveTo(x * TILE_SIZE, 0);
      this.gridGraphics.lineTo(x * TILE_SIZE, this.map.height * TILE_SIZE);
    }
    for (let y = 0; y <= this.map.height; y++) {
      this.gridGraphics.moveTo(0, y * TILE_SIZE);
      this.gridGraphics.lineTo(this.map.width * TILE_SIZE, y * TILE_SIZE);
    }
    this.gridGraphics.strokePath();
  }

  private pointerToTile(pointer: Phaser.Input.Pointer): { tileX: number; tileY: number } {
    return {
      tileX: Math.floor(pointer.worldX / TILE_SIZE),
      tileY: Math.floor(pointer.worldY / TILE_SIZE),
    };
  }

  private isInBounds(tileX: number, tileY: number): boolean {
    return tileX >= 0 && tileY >= 0 && tileX < this.map.width && tileY < this.map.height;
  }
}
