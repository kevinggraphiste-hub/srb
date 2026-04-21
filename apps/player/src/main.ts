import * as Phaser from 'phaser';
import { PlayScene } from './scenes/PlayScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  parent: 'game',
  backgroundColor: '#1a1a1a',
  pixelArt: true,
  scene: [PlayScene],
};

new Phaser.Game(config);
