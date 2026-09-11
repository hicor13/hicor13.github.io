import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GOGOLOGO', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(cx, cy, `Best: ${getBestScore()}`, { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to start', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    const start = (): void => {
      this.scene.start('GameScene');
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }
}
