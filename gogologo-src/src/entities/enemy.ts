import Phaser from 'phaser';
import { ENEMY_TARGET_WIDTH } from '../config/visual-config';
import { REFERENCE_HEIGHT } from '../config/layout-config';

// Pixels per second, downward, at REFERENCE_HEIGHT (the mobile canvas this
// was originally tuned against) — no formation/AI yet, sub-project 3's job.
export const ENEMY_BASE_SPEED = 80;

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  // Scaled to the current canvas's actual height, so an enemy takes about
  // the same fraction-of-screen time to descend on a shorter (desktop)
  // canvas as on the taller mobile one. GameScene re-reads this after
  // Phaser.Physics.Arcade.Group#add resets velocity to the group's default.
  readonly speed: number;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, tintColor: number) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(ENEMY_TARGET_WIDTH, ENEMY_TARGET_WIDTH * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    this.speed = ENEMY_BASE_SPEED * (scene.scale.height / REFERENCE_HEIGHT);
    this.sprite.setVelocityY(this.speed);
    // Multiply-tint: recolors the drawing without touching alpha, so the
    // black-to-transparent conversion (see black-to-transparent.ts) still holds.
    this.sprite.setTint(tintColor);
  }
}
