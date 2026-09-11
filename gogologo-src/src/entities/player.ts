import Phaser from 'phaser';

const FIRE_COOLDOWN_MS = 350;
const PROJECTILE_SPEED = 500;

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private lastFiredAt = 0;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setCollideWorldBounds(true);
    this.projectiles = scene.physics.add.group();
  }

  moveToX(targetX: number): void {
    const clamped = Phaser.Math.Clamp(targetX, 16, this.scene.scale.width - 16);
    this.sprite.x = clamped;
  }

  fire(): void {
    const now = this.scene.time.now;
    if (now - this.lastFiredAt < FIRE_COOLDOWN_MS) return;
    this.lastFiredAt = now;

    const projectile = this.projectiles.create(
      this.sprite.x,
      this.sprite.y - 20,
      'projectile'
    ) as Phaser.Physics.Arcade.Sprite;
    projectile.setVelocityY(-PROJECTILE_SPEED);
  }

  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }
}
