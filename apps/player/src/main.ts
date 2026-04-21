import * as Phaser from 'phaser';
import { LoadScene } from './scenes/LoadScene';
import { PlayScene } from './scenes/PlayScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  parent: 'game',
  backgroundColor: '#0a0a0a',
  pixelArt: true,
  scene: [LoadScene, PlayScene],
};

new Phaser.Game(config);
