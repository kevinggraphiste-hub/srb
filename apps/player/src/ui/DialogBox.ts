import type * as Phaser from 'phaser';

const BOX_MARGIN = 12;
const BOX_HEIGHT = 100;
const BOX_PADDING = 14;
const BOX_FILL = 0x0a0a0a;
const BOX_FILL_ALPHA = 0.92;
const BOX_BORDER = 0xe0e0e0;

/**
 * Screen-fixed dialog box for the `show_text` event command.
 * Kept minimal for Phase 1: single-page text, "Press Space to continue" hint.
 * Typewriter effect and multi-page paging land in Phase 3.
 */
export class DialogBox {
  private container: Phaser.GameObjects.Container;
  private textObject: Phaser.GameObjects.Text;
  private isOpenFlag = false;

  constructor(scene: Phaser.Scene) {
    const viewW = scene.scale.width;
    const viewH = scene.scale.height;
    const boxWidth = viewW - BOX_MARGIN * 2;

    const bg = scene.add.rectangle(0, 0, boxWidth, BOX_HEIGHT, BOX_FILL, BOX_FILL_ALPHA);
    bg.setStrokeStyle(2, BOX_BORDER);
    bg.setOrigin(0, 0);

    this.textObject = scene.add.text(BOX_PADDING, BOX_PADDING, '', {
      color: '#e0e0e0',
      fontSize: '14px',
      fontFamily: 'monospace',
      wordWrap: { width: boxWidth - BOX_PADDING * 2 },
      lineSpacing: 4,
    });

    const hint = scene.add
      .text(boxWidth - BOX_PADDING, BOX_HEIGHT - BOX_PADDING, '▼ Space', {
        color: '#888',
        fontSize: '10px',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 1);

    this.container = scene.add.container(BOX_MARGIN, viewH - BOX_HEIGHT - BOX_MARGIN, [
      bg,
      this.textObject,
      hint,
    ]);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    this.container.setVisible(false);
  }

  open(text: string): void {
    this.textObject.setText(text);
    this.container.setVisible(true);
    this.isOpenFlag = true;
  }

  close(): void {
    this.container.setVisible(false);
    this.isOpenFlag = false;
  }

  isOpen(): boolean {
    return this.isOpenFlag;
  }
}
