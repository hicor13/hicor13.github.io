import Phaser from 'phaser';
import { createInputController, InputController } from '../systems/input-system';
import { Player } from '../entities/player';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 10);
    graphics.generateTexture('projectile', 4, 10);
    graphics.destroy();

    const textureKeys = this.registry.get('drawingTextureKeys') as string[];
    this.player = new Player(this, textureKeys[0], this.scale.width / 2, this.scale.height - 60);
    this.inputController = createInputController(this);
  }

  update(): void {
    this.player.moveToX(this.inputController.getTargetX(this.player.sprite.x));
    if (this.inputController.isFiring()) {
      this.player.fire();
    }
  }
}
