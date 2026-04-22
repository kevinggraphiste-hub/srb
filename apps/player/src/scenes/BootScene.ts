import * as Phaser from 'phaser';
import { isPreviewMode } from '../preview';

/**
 * First scene in the lifecycle. Handles one-time engine setup
 * (pixel rounding, input options, global plugins) and hands off to
 * the next scene. In preview mode the title menu is skipped so the
 * editor user gets straight to the game.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    this.scene.start(isPreviewMode() ? 'LoadScene' : 'MenuScene');
  }
}
