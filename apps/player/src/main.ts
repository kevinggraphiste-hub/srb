import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LoadScene } from './scenes/LoadScene';
import { PlayScene } from './scenes/PlayScene';
import { isPreviewMode, waitForPreviewProject } from './preview';

async function boot(): Promise<void> {
  // In preview mode, wait for the editor to hand us the project before Phaser boots.
  // If no project arrives within the timeout we still start — the player will fall
  // back to fetching /maps JSON, which in an editor context is likely to 404.
  if (isPreviewMode()) {
    await waitForPreviewProject();
  }

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
}

void boot();
