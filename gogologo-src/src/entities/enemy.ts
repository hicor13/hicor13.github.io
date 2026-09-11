import Phaser from 'phaser';

export const ENEMY_SPEED = 80; // pixels per second, downward — no formation/AI yet, sub-project 3's job

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setVelocityY(ENEMY_SPEED);
  }
}
