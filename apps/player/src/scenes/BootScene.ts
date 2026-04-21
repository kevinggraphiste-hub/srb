import * as Phaser from 'phaser';

/**
 * First scene in the lifecycle. Handles one-time engine setup
 * (pixel rounding, input options, global plugins) and hands off to
 * MenuScene. Kept deliberately minimal — heavy preloading belongs in LoadScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    this.scene.start('MenuScene');
  }
}
