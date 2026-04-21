import * as Phaser from 'phaser';
import { loadMap } from '../loaders/map-loader';
import { loadCharacterSheet } from '../loaders/character-loader';

const STARTING_MAP_ID = 'village-01';
const STARTING_PLAYER_SHEET_ID = 'ash';

export class LoadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadScene' });
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY, 'Loading…', {
        color: '#e0e0e0',
        fontSize: '20px',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    try {
      const [map, playerSheet] = await Promise.all([
        loadMap(STARTING_MAP_ID),
        loadCharacterSheet(STARTING_PLAYER_SHEET_ID),
      ]);

      this.load.spritesheet(playerSheet.id, playerSheet.imagePath, {
        frameWidth: playerSheet.frameWidth,
        frameHeight: playerSheet.frameHeight,
      });

      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.scene.start('PlayScene', { map, playerSheet });
      });
      this.load.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.add
        .text(centerX, centerY + 40, `Error: ${message}`, {
          color: '#ff6b6b',
          fontSize: '14px',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
    }
  }
}
