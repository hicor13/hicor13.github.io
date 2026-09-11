import Phaser from 'phaser';
import { EnemyType } from '../config/entity-config';

export type EnemyState = 'ENTERING' | 'HOLDING' | 'DIVING' | 'RETURNING';

const BOB_AMPLITUDE = 6; // px, idle sway while HOLDING
const BOB_DURATION_MS = 900;
const RETURN_DURATION_MS = 700;

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly type: EnemyType;
  state: EnemyState = 'ENTERING';
  // Set by the caller (FormationManager) right after construction, before
  // enterAlong() is called -- the slot this enemy holds/returns to.
  homeX = 0;
  homeY = 0;

  private scene: Phaser.Scene;
  private activeTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, type: EnemyType) {
    this.scene = scene;
    this.type = type;
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(type.targetWidth, type.targetWidth * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    // Movement is driven entirely by tweens on the sprite's x/y (see
    // enterAlong/diveAt below), never by Arcade velocity. Body.preUpdate()
    // re-syncs the body's position from the sprite's transform every physics
    // step regardless of velocity, so overlap detection tracks the tween
    // correctly without any extra wiring.
    body.setVelocity(0, 0);
    // Multiply-tint: recolors the drawing without touching alpha, so the
    // black-to-transparent conversion (see black-to-transparent.ts) still holds.
    this.sprite.setTint(type.tintColor);
    // Phaser's data manager, not a plain property -- GameScene reads this
    // back off the raw sprite in its physics overlap callbacks, which only
    // hand back Phaser.Physics.Arcade.Sprite, not this Enemy wrapper.
    this.sprite.setData('points', type.points);
    this.sprite.setData('enemyRef', this);
  }

  enterAlong(path: Phaser.Curves.Path, durationMs: number, onComplete: () => void): void {
    this.state = 'ENTERING';
    const proxy = { t: 0 };
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = path.getPoint(proxy.t);
        this.sprite.setPosition(p.x, p.y);
      },
      onComplete: () => {
        this.state = 'HOLDING';
        this.startBob();
        onComplete();
      },
    });
  }

  diveAt(targetX: number, targetY: number, durationMs: number, onComplete: () => void): void {
    this.stopActiveTween();
    this.state = 'DIVING';

    const startX = this.sprite.x;
    const startY = this.sprite.y;
    // Loop back up off whichever side of the canvas the enemy is nearer to,
    // then the final short leg (returnToSlot) brings it back onto screen
    // into its slot.
    const exitX = startX < this.scene.scale.width / 2 ? -40 : this.scene.scale.width + 40;
    const nearPlayerY = targetY - 40; // stop just above the player, not on top of it

    const path = new Phaser.Curves.Path(startX, startY);
    path.quadraticBezierTo(targetX, nearPlayerY, (startX + targetX) / 2, (startY + nearPlayerY) / 2);
    path.quadraticBezierTo(exitX, startY, (targetX + exitX) / 2, nearPlayerY);

    const proxy = { t: 0 };
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = path.getPoint(proxy.t);
        this.sprite.setPosition(p.x, p.y);
      },
      onComplete: () => this.returnToSlot(onComplete),
    });
  }

  destroy(): void {
    this.stopActiveTween();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  private returnToSlot(onComplete: () => void): void {
    this.state = 'RETURNING';
    this.activeTween = this.scene.tweens.add({
      targets: this.sprite,
      x: this.homeX,
      y: this.homeY,
      duration: RETURN_DURATION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.state = 'HOLDING';
        this.startBob();
        onComplete();
      },
    });
  }

  private startBob(): void {
    this.activeTween = this.scene.tweens.add({
      targets: this.sprite,
      y: this.homeY - BOB_AMPLITUDE,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopActiveTween(): void {
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = undefined;
    }
  }
}
