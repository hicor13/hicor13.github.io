import Phaser from 'phaser';
import { ACCENT_COLOR, HUD_TEXT_COLOR, HUD_TEXT_COLOR_SECONDARY } from '../config/visual-config';

interface DrawingEntry {
  key: string;
  name: string;
}

const GRID_COLS = 4;
const CELL_WIDTH = 100;
const CELL_HEIGHT = 120;
const CELL_GAP_X = 10;
const CELL_GAP_Y = 20;
const GRID_MARGIN_X = 25;
// This layout assumes at most 3 rows (12 drawings / 4 columns), which holds
// only because PreloadScene's DRAWING_POOL_SIZE is 12. If DRAWING_POOL_SIZE
// grows, the grid layout constants here need matching changes.
const GRID_START_Y = 280;
const PORTRAIT_BOX = 80;

export class CharacterSelectScene extends Phaser.Scene {
  private drawings: DrawingEntry[] = [];
  private highlightedIndex = 0;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.drawings = this.registry.get('drawings') as DrawingEntry[];
    this.highlightedIndex = 0;

    this.add
      .text(this.scale.width / 2, 200, 'CHOOSE YOUR SHIP', { fontSize: '28px', color: HUD_TEXT_COLOR })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 720, 'Arrows / Tap: choose', {
        fontSize: '14px',
        color: HUD_TEXT_COLOR_SECONDARY,
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 745, 'Space / Tap again: confirm', {
        fontSize: '14px',
        color: HUD_TEXT_COLOR_SECONDARY,
      })
      .setOrigin(0.5);

    this.drawings.forEach((entry, index) => {
      const { x, y } = this.cellTopLeft(index);
      const portraitCx = x + CELL_WIDTH / 2;
      const portraitCy = y + PORTRAIT_BOX / 2;

      const image = this.add.image(portraitCx, portraitCy, entry.key);
      const nativeWidth = image.width;
      const nativeHeight = image.height;
      const scale = Math.min(PORTRAIT_BOX / nativeWidth, PORTRAIT_BOX / nativeHeight);
      image.setDisplaySize(nativeWidth * scale, nativeHeight * scale);

      this.add
        .text(portraitCx, y + PORTRAIT_BOX + 8, entry.name, {
          fontSize: '12px',
          color: HUD_TEXT_COLOR,
          wordWrap: { width: CELL_WIDTH },
        })
        .setOrigin(0.5, 0);
    });

    this.highlightGraphics = this.add.graphics();
    this.drawHighlight();

    const cursors = this.input.keyboard!.createCursorKeys();
    const keySpace = this.input.keyboard!.addKey('SPACE');
    const keyEnter = this.input.keyboard!.addKey('ENTER');

    // Guard against a key that was already held down on the prior screen
    // (e.g. Space used to confirm the MenuScene transition) from
    // immediately firing a selection here via OS key-repeat.
    this.time.delayedCall(250, () => {
      cursors.left.on('down', () => this.moveHighlight('left'));
      cursors.right.on('down', () => this.moveHighlight('right'));
      cursors.up.on('down', () => this.moveHighlight('up'));
      cursors.down.on('down', () => this.moveHighlight('down'));
      keySpace.on('down', () => this.confirmSelection(this.highlightedIndex));
      keyEnter.on('down', () => this.confirmSelection(this.highlightedIndex));
    });

    this.drawings.forEach((_, index) => {
      const { x, y } = this.cellTopLeft(index);
      const zone = this.add.zone(x, y, CELL_WIDTH, CELL_HEIGHT).setOrigin(0, 0).setInteractive();
      zone.on('pointerdown', () => {
        if (index === this.highlightedIndex) {
          this.confirmSelection(index);
        } else {
          this.highlightedIndex = index;
          this.drawHighlight();
        }
      });
    });
  }

  private cellTopLeft(index: number): { x: number; y: number } {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    return {
      x: GRID_MARGIN_X + col * (CELL_WIDTH + CELL_GAP_X),
      y: GRID_START_Y + row * (CELL_HEIGHT + CELL_GAP_Y),
    };
  }

  private moveHighlight(direction: 'left' | 'right' | 'up' | 'down'): void {
    const count = this.drawings.length;
    const numRows = Math.ceil(count / GRID_COLS);
    const col = this.highlightedIndex % GRID_COLS;
    const row = Math.floor(this.highlightedIndex / GRID_COLS);

    let newIndex = this.highlightedIndex;

    if (direction === 'right') {
      const newCol = (col + 1) % GRID_COLS;
      newIndex = row * GRID_COLS + newCol;
      if (newIndex >= count) newIndex = row * GRID_COLS;
    } else if (direction === 'left') {
      const newCol = (col - 1 + GRID_COLS) % GRID_COLS;
      newIndex = row * GRID_COLS + newCol;
      if (newIndex >= count) {
        const lastColInRow = Math.min(GRID_COLS - 1, count - 1 - row * GRID_COLS);
        newIndex = row * GRID_COLS + lastColInRow;
      }
    } else if (direction === 'down') {
      const newRow = (row + 1) % numRows;
      newIndex = newRow * GRID_COLS + col;
      if (newIndex >= count) newIndex = count - 1;
    } else if (direction === 'up') {
      const newRow = (row - 1 + numRows) % numRows;
      newIndex = newRow * GRID_COLS + col;
      if (newIndex >= count) newIndex = count - 1;
    }

    this.highlightedIndex = newIndex;
    this.drawHighlight();
  }

  private drawHighlight(): void {
    const { x, y } = this.cellTopLeft(this.highlightedIndex);
    this.highlightGraphics.clear();
    this.highlightGraphics.lineStyle(4, ACCENT_COLOR, 1);
    this.highlightGraphics.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
  }

  private confirmSelection(index: number): void {
    const picked = this.drawings[index];
    const reordered = [picked, ...this.drawings.filter((_, i) => i !== index)];
    this.registry.set('drawings', reordered);
    this.registry.set(
      'drawingTextureKeys',
      reordered.map((d) => d.key)
    );
    this.scene.start('GameScene');
  }
}
