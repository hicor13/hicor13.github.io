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
    const PLAYER_TARGET_WIDTH = 48;
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(PLAYER_TARGET_WIDTH, PLAYER_TARGET_WIDTH * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    this.sprite.setCollideWorldBounds(true);
    this.projectiles = scene.physics.add.group();
  }

  moveToX(targetX: number): void {
    const halfWidth = this.sprite.displayWidth / 2;
    const clamped = Phaser.Math.Clamp(targetX, halfWidth, this.scene.scale.width - halfWidth);
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
