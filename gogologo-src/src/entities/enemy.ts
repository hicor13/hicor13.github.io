import Phaser from 'phaser';
import { ENEMY_TARGET_WIDTH } from '../config/visual-config';

export const ENEMY_SPEED = 80; // pixels per second, downward — no formation/AI yet, sub-project 3's job

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, tintColor: number) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(ENEMY_TARGET_WIDTH, ENEMY_TARGET_WIDTH * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    this.sprite.setVelocityY(ENEMY_SPEED);
    // Multiply-tint: recolors the drawing without touching alpha, so the
    // black-to-transparent conversion (see black-to-transparent.ts) still holds.
    this.sprite.setTint(tintColor);
  }
}
