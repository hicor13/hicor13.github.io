import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';
import { HUD_TEXT_COLOR, HUD_TEXT_COLOR_SECONDARY } from '../config/visual-config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GOGOLOGO', { fontSize: '32px', color: HUD_TEXT_COLOR }).setOrigin(0.5);
    this.add
      .text(cx, cy, `Best: ${getBestScore()}`, { fontSize: '16px', color: HUD_TEXT_COLOR_SECONDARY })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to start', { fontSize: '16px', color: HUD_TEXT_COLOR })
      .setOrigin(0.5);

    const start = (): void => {
      this.scene.start('CharacterSelectScene');
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }
}
