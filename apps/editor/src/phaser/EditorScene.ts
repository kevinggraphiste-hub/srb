import * as Phaser from 'phaser';
import type { GameMap } from '@srb/types';
import { getTileDef } from '@srb/engine';

export const TILE_SIZE = 32;

export type RenderableLayerId = 'background' | 'ground' | 'detail' | 'objects' | 'overlay';

export type HoverStyle = 'stamp' | 'eraser' | 'rect' | 'fill';

/** Raw pointer events emitted to React, which owns all edit logic. */
export interface EditorSceneCallbacks {
  onPointerDown: (tileX: number, tileY: number) => void;
  onPointerDrag: (tileX: number, tileY: number) => void;
  onPointerUp: (tileX: number, tileY: number) => void;
}

export const EDITOR_DATA_REGISTRY_KEY = 'editorData';

export interface EditorSceneData {
  map: GameMap;
  hiddenLayers: Set<RenderableLayerId>;
  callbacks: EditorSceneCallbacks;
}

export class EditorScene extends Phaser.Scene {
  private map!: GameMap;
  private hiddenLayers: Set<RenderableLayerId> = new Set();
  private callbacks!: EditorSceneCallbacks;

  private mapGraphics!: Phaser.GameObjects.Graphics;
  private collisionOverlay!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private hoverRect!: Phaser.GameObjects.Rectangle;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private previewColor = 0xff6b6b;

  private showCollision = false;

  constructor() {
    super({ key: 'EditorScene' });
  }

  setHoverStyle(tool: HoverStyle): void {
    if (!this.hoverRect) return;
    const color =
      tool === 'eraser'
        ? 0xaaaaaa
        : tool === 'fill'
          ? 0x5ed07a
          : tool === 'rect'
            ? 0xffd96b
            : 0xff6b6b;
    this.hoverRect.setStrokeStyle(2, color);
    this.previewColor = color;
  }

  setHiddenLayers(hidden: Set<RenderableLayerId>): void {
    this.hiddenLayers = hidden;
    if (this.mapGraphics) this.renderMap();
  }

  setShowCollision(show: boolean): void {
    this.showCollision = show;
    if (this.collisionOverlay) this.renderCollision();
  }

  /** Show a filled preview rectangle between two tiles (inclusive). Pass null to hide. */
  setPreviewRect(rect: { x0: number; y0: number; x1: number; y1: number } | null): void {
    if (!this.previewGraphics) return;
    this.previewGraphics.clear();
    if (!rect) return;
    const minX = Math.min(rect.x0, rect.x1);
    const maxX = Math.max(rect.x0, rect.x1);
    const minY = Math.min(rect.y0, rect.y1);
    const maxY = Math.max(rect.y0, rect.y1);
    const w = (maxX - minX + 1) * TILE_SIZE;
    const h = (maxY - minY + 1) * TILE_SIZE;
    const px = minX * TILE_SIZE;
    const py = minY * TILE_SIZE;
    this.previewGraphics.fillStyle(this.previewColor, 0.25);
    this.previewGraphics.fillRect(px, py, w, h);
    this.previewGraphics.lineStyle(2, this.previewColor, 1);
    this.previewGraphics.strokeRect(px, py, w, h);
  }

  create(): void {
    const data = this.game.registry.get(EDITOR_DATA_REGISTRY_KEY) as EditorSceneData | undefined;
    if (!data) {
      throw new Error(`EditorScene: missing registry key "${EDITOR_DATA_REGISTRY_KEY}"`);
    }
    this.map = data.map;
    this.hiddenLayers = data.hiddenLayers;
    this.callbacks = data.callbacks;

    this.cameras.main.setBackgroundColor('#1a1a1a');
    this.mapGraphics = this.add.graphics();
    this.renderMap();

    this.collisionOverlay = this.add.graphics();
    this.renderCollision();

    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    this.hoverRect = this.add
      .rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.15)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xff6b6b);
    this.hoverRect.setVisible(false);

    this.previewGraphics = this.add.graphics();
    this.previewGraphics.setDepth(500);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const { tileX, tileY } = this.pointerToTile(pointer);
      if (this.isInBounds(tileX, tileY)) {
        this.hoverRect.setVisible(true);
        this.hoverRect.setPosition(tileX * TILE_SIZE, tileY * TILE_SIZE);
      } else {
        this.hoverRect.setVisible(false);
      }
      if (pointer.isDown) {
        const clamped = this.clampTile(tileX, tileY);
        this.callbacks.onPointerDrag(clamped.tileX, clamped.tileY);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { tileX, tileY } = this.pointerToTile(pointer);
      if (!this.isInBounds(tileX, tileY)) return;
      this.callbacks.onPointerDown(tileX, tileY);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const { tileX, tileY } = this.pointerToTile(pointer);
      const clamped = this.clampTile(tileX, tileY);
      this.callbacks.onPointerUp(clamped.tileX, clamped.tileY);
    });
  }

  refresh(map: GameMap): void {
    this.map = map;
    this.renderMap();
    this.renderCollision();
    this.drawGrid();
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

  private renderCollision(): void {
    this.collisionOverlay.clear();
    if (!this.showCollision) return;
    for (let y = 0; y < this.map.height; y++) {
      const row = this.map.collision[y];
      if (!row) continue;
      for (let x = 0; x < this.map.width; x++) {
        if (row[x]) {
          this.collisionOverlay.fillStyle(0xff3333, 0.45);
          this.collisionOverlay.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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

  private clampTile(tileX: number, tileY: number): { tileX: number; tileY: number } {
    return {
      tileX: Math.max(0, Math.min(this.map.width - 1, tileX)),
      tileY: Math.max(0, Math.min(this.map.height - 1, tileY)),
    };
  }

  private isInBounds(tileX: number, tileY: number): boolean {
    return tileX >= 0 && tileY >= 0 && tileX < this.map.width && tileY < this.map.height;
  }
}
