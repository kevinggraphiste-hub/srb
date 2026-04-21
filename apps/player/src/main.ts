import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LoadScene } from './scenes/LoadScene';
import { PlayScene } from './scenes/PlayScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  parent: 'game',
  backgroundColor: '#0a0a0a',
  pixelArt: true,
  scene: [BootScene, MenuScene, LoadScene, PlayScene],
};

new Phaser.Game(config);
