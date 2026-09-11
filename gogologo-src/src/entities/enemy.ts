import Phaser from 'phaser';
import { ENEMY_BASE_SPEED, EnemyType } from '../config/entity-config';
import { REFERENCE_HEIGHT } from '../config/layout-config';

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  // Scaled to the current canvas's actual height, so an enemy takes about
  // the same fraction-of-screen time to descend on a shorter (desktop)
  // canvas as on the taller mobile one. GameScene re-reads this after
  // Phaser.Physics.Arcade.Group#add resets velocity to the group's default.
  readonly speed: number;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, type: EnemyType) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(type.targetWidth, type.targetWidth * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    this.speed = ENEMY_BASE_SPEED * type.speedMultiplier * (scene.scale.height / REFERENCE_HEIGHT);
    this.sprite.setVelocityY(this.speed);
    // Multiply-tint: recolors the drawing without touching alpha, so the
    // black-to-transparent conversion (see black-to-transparent.ts) still holds.
    this.sprite.setTint(type.tintColor);
    // Phaser's data manager, not a plain property -- GameScene reads this
    // back off the raw sprite in its physics overlap callback, which only
    // hands back Phaser.Physics.Arcade.Sprite, not this Enemy wrapper.
    this.sprite.setData('points', type.points);
  }
}
