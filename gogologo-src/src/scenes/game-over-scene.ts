import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: { score: number }): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GAME OVER', { fontSize: '28px', color: '#ff0000' }).setOrigin(0.5);
    this.add
      .text(cx, cy - 20, `Score: ${data.score}`, { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 10, `Best: ${getBestScore()}`, { fontSize: '18px', color: '#cccccc' })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to restart', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    const restart = (): void => {
      this.scene.start('GameScene');
    };
    this.time.delayedCall(600, () => {
      this.input.once('pointerdown', restart);
      this.input.keyboard?.once('keydown-SPACE', restart);
    });
  }
}
