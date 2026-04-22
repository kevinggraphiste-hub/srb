import type * as Phaser from 'phaser';

const BOX_MARGIN = 12;
const BOX_PADDING = 14;
const BOX_BODY_HEIGHT_TEXT = 100;
const CHOICE_LINE_HEIGHT = 20;
const SPEAKER_HEIGHT = 22;
const BOX_FILL = 0x0a0a0a;
const BOX_FILL_ALPHA = 0.94;
const BOX_BORDER_OUTER = 0x4d1313;
const BOX_BORDER_INNER = 0xff6b6b;
const SPEAKER_FILL = 0x1a1a1a;
const SPEAKER_BORDER = 0xff6b6b;
const CURSOR_COLOR = 0xff6b6b;

export type DialogMode = 'closed' | 'text' | 'choices';

export interface OpenTextOptions {
  text: string;
  speaker?: string;
}

export interface DialogChoice {
  label: string;
}

export interface OpenChoicesOptions {
  prompt: string;
  choices: DialogChoice[];
  defaultIndex?: number;
  cancelIndex?: number;
  speaker?: string;
}

/**
 * Screen-fixed dialog box for the show_text / show_choices commands.
 * v0.5: double-border frame, optional speaker bandeau, choice list with
 * keyboard cursor navigation. Typewriter effect still deferred.
 */
export class DialogBox {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private bodyBg!: Phaser.GameObjects.Graphics;
  private textObject!: Phaser.GameObjects.Text;
  private hintObject!: Phaser.GameObjects.Text;
  private speakerContainer!: Phaser.GameObjects.Container;
  private speakerBg!: Phaser.GameObjects.Graphics;
  private speakerText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private cursorObject!: Phaser.GameObjects.Text;

  private mode: DialogMode = 'closed';
  private selectedIndex = 0;
  private cancelIndex: number | null = null;

  private viewW: number;
  private viewH: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.viewW = scene.scale.width;
    this.viewH = scene.scale.height;

    const boxWidth = this.viewW - BOX_MARGIN * 2;

    this.bodyBg = scene.add.graphics();

    this.textObject = scene.add.text(BOX_PADDING, BOX_PADDING, '', {
      color: '#e0e0e0',
      fontSize: '14px',
      fontFamily: 'monospace',
      wordWrap: { width: boxWidth - BOX_PADDING * 2 },
      lineSpacing: 4,
    });

    this.hintObject = scene.add
      .text(boxWidth - BOX_PADDING, 0, '', {
        color: '#888',
        fontSize: '10px',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 1);

    this.speakerBg = scene.add.graphics();
    this.speakerText = scene.add.text(12, 4, '', {
      color: '#ff6b6b',
      fontSize: '12px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.speakerContainer = scene.add.container(0, -SPEAKER_HEIGHT, [
      this.speakerBg,
      this.speakerText,
    ]);
    this.speakerContainer.setVisible(false);

    this.cursorObject = scene.add.text(0, 0, '▶', {
      color: `#${CURSOR_COLOR.toString(16).padStart(6, '0')}`,
      fontSize: '14px',
      fontFamily: 'monospace',
    });
    this.cursorObject.setVisible(false);

    this.container = scene.add.container(BOX_MARGIN, this.viewH - BOX_BODY_HEIGHT_TEXT - BOX_MARGIN, [
      this.bodyBg,
      this.speakerContainer,
      this.textObject,
      this.hintObject,
      this.cursorObject,
    ]);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    this.container.setVisible(false);
  }

  openText(opt: OpenTextOptions): void {
    this.mode = 'text';
    this.renderFrame(BOX_BODY_HEIGHT_TEXT);
    this.renderSpeaker(opt.speaker);
    this.textObject.setText(opt.text);
    this.textObject.setPosition(BOX_PADDING, BOX_PADDING);
    this.setCursorVisible(false);
    this.clearChoiceTexts();
    this.hintObject.setText('▼ Space');
    this.container.setVisible(true);
  }

  openChoices(opt: OpenChoicesOptions): void {
    this.mode = 'choices';
    const promptText = opt.prompt.trim();
    const hasPrompt = promptText.length > 0;
    const promptHeight = hasPrompt ? this.measurePromptHeight(promptText) + BOX_PADDING : BOX_PADDING;
    const choicesHeight = Math.max(1, opt.choices.length) * CHOICE_LINE_HEIGHT;
    const bodyHeight = Math.max(
      BOX_BODY_HEIGHT_TEXT,
      promptHeight + choicesHeight + BOX_PADDING + 8,
    );

    this.renderFrame(bodyHeight);
    this.renderSpeaker(opt.speaker);

    this.textObject.setText(hasPrompt ? promptText : '');
    this.textObject.setPosition(BOX_PADDING, BOX_PADDING);

    this.clearChoiceTexts();
    const choiceStartY = hasPrompt ? BOX_PADDING + promptHeight - BOX_PADDING + 4 : BOX_PADDING;
    for (let i = 0; i < opt.choices.length; i++) {
      const label = opt.choices[i]?.label ?? `(choix ${i + 1})`;
      const t = this.scene.add.text(BOX_PADDING + 18, choiceStartY + i * CHOICE_LINE_HEIGHT, label, {
        color: '#e0e0e0',
        fontSize: '13px',
        fontFamily: 'monospace',
      });
      this.container.add(t);
      this.choiceTexts.push(t);
    }

    this.cancelIndex = opt.cancelIndex ?? null;
    const fallbackIdx = opt.defaultIndex ?? 0;
    this.selectedIndex = Math.min(Math.max(fallbackIdx, 0), Math.max(0, opt.choices.length - 1));
    this.refreshCursor();

    this.hintObject.setText(this.cancelIndex !== null ? '↑↓ · Space · Esc' : '↑↓ · Space');
    this.container.setVisible(true);
  }

  close(): void {
    this.mode = 'closed';
    this.container.setVisible(false);
    this.clearChoiceTexts();
    this.setCursorVisible(false);
    this.speakerContainer.setVisible(false);
    this.cancelIndex = null;
  }

  getMode(): DialogMode {
    return this.mode;
  }

  isOpen(): boolean {
    return this.mode !== 'closed';
  }

  moveCursor(delta: -1 | 1): void {
    if (this.mode !== 'choices' || this.choiceTexts.length === 0) return;
    const n = this.choiceTexts.length;
    this.selectedIndex = (this.selectedIndex + delta + n) % n;
    this.refreshCursor();
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  getCancelIndex(): number | null {
    return this.cancelIndex;
  }

  private renderFrame(bodyHeight: number): void {
    const boxWidth = this.viewW - BOX_MARGIN * 2;
    this.bodyBg.clear();
    this.bodyBg.fillStyle(BOX_FILL, BOX_FILL_ALPHA);
    this.bodyBg.fillRect(0, 0, boxWidth, bodyHeight);
    this.bodyBg.lineStyle(3, BOX_BORDER_OUTER, 1);
    this.bodyBg.strokeRect(0, 0, boxWidth, bodyHeight);
    this.bodyBg.lineStyle(1, BOX_BORDER_INNER, 1);
    this.bodyBg.strokeRect(3, 3, boxWidth - 6, bodyHeight - 6);

    this.container.setY(this.viewH - bodyHeight - BOX_MARGIN);
    this.hintObject.setPosition(boxWidth - BOX_PADDING, bodyHeight - 6);
  }

  private renderSpeaker(name?: string): void {
    const trimmed = name?.trim();
    if (!trimmed) {
      this.speakerContainer.setVisible(false);
      return;
    }
    this.speakerText.setText(trimmed);
    const textW = this.speakerText.width;
    const boxW = Math.ceil(textW + 24);
    this.speakerBg.clear();
    this.speakerBg.fillStyle(SPEAKER_FILL, 1);
    this.speakerBg.fillRect(0, 0, boxW, SPEAKER_HEIGHT);
    this.speakerBg.lineStyle(2, SPEAKER_BORDER, 1);
    this.speakerBg.strokeRect(0, 0, boxW, SPEAKER_HEIGHT);
    this.speakerContainer.setVisible(true);
  }

  private clearChoiceTexts(): void {
    for (const t of this.choiceTexts) t.destroy();
    this.choiceTexts = [];
  }

  private refreshCursor(): void {
    const current = this.choiceTexts[this.selectedIndex];
    if (!current) {
      this.setCursorVisible(false);
      return;
    }
    this.cursorObject.setPosition(BOX_PADDING, current.y);
    this.setCursorVisible(true);
    for (let i = 0; i < this.choiceTexts.length; i++) {
      this.choiceTexts[i]!.setColor(i === this.selectedIndex ? '#ff6b6b' : '#e0e0e0');
    }
  }

  private setCursorVisible(v: boolean): void {
    this.cursorObject.setVisible(v);
  }

  private measurePromptHeight(promptText: string): number {
    // Phaser auto-wraps based on the text object's wordWrap width. We render
    // once with the real text to measure, then keep it (renderFrame + setText
    // run in order so the measure is accurate by the time choices are placed).
    this.textObject.setText(promptText);
    return Math.max(20, this.textObject.height);
  }
}
