import Phaser from 'phaser';
import { Enemy } from '../entities/enemy';
import { ENEMY_TYPES } from '../config/entity-config';
import { LevelConfig } from '../config/formation-config';
import { REFERENCE_HEIGHT } from '../config/layout-config';

// Row spacing and top margin are tuned against REFERENCE_HEIGHT (see
// layout-config.ts) and scaled by actual canvas height at wave-start time,
// same pattern Enemy previously used for fall speed.
//
// ROW_SPACING must clear the tallest enemy type's on-screen display height
// on the SMALLEST canvas this scales onto (desktop, 640px vs mobile's
// REFERENCE_HEIGHT of 1040px), since enemy display height is a fixed pixel
// size (entity-config.ts's targetWidth) that does NOT shrink with
// scaleFactor the way this row gap does. Comandante is the tallest type
// (targetWidth 120) and every Garabatos drawing shares a fixed 640x400
// source-canvas aspect ratio (see garabatos/canvas.js), so its display
// height is 120 * (400/640) = 75px on every layout. At desktop's
// scaleFactor of 640/1040 ≈ 0.615, a spacing needs to be at least
// 75 / 0.615 ≈ 121.9 to avoid overlap -- 130 clears that with a bit of
// visible gap to spare (130 * 0.615 ≈ 80px on desktop; 130px on mobile,
// where scaleFactor is 1).
const ROW_SPACING = 130;
const GRID_TOP_MARGIN = 90;
const ENTRANCE_STAGGER_MS = 150;
const ENTRANCE_BASE_DURATION_MS = 900;
const DIVE_BASE_DURATION_MS = 1600;

export class FormationManager {
  private activeEnemies: Enemy[] = [];
  private diveTimer?: Phaser.Time.TimerEvent;

  constructor(
    private scene: Phaser.Scene,
    private enemyGroup: Phaser.Physics.Arcade.Group,
    private drawingTextureKeys: string[],
    private getPlayerPosition: () => { x: number; y: number },
    private onWaveClear: () => void
  ) {}

  startWave(config: LevelConfig): void {
    this.diveTimer?.remove();
    this.activeEnemies = [];

    const scaleFactor = this.scene.scale.height / REFERENCE_HEIGHT;
    const colWidth = this.scene.scale.width / config.cols;
    const rowSpacing = ROW_SPACING * scaleFactor;
    const topMargin = GRID_TOP_MARGIN * scaleFactor;

    // Start at 1, not 0: drawingTextureKeys[0] is always the player's own
    // Garabatos drawing (GameScene builds the player from index 0, per
    // CharacterSelectScene's reorder-to-index-0 logic) -- skip it so the
    // player's own artwork doesn't also show up worn by an enemy.
    let textureIndex = 1;
    let spawnDelay = 0;

    for (let row = 0; row < config.rows; row++) {
      const typeIndex =
        (ENEMY_TYPES.length - 1 - (row % ENEMY_TYPES.length) + ENEMY_TYPES.length) %
        ENEMY_TYPES.length;
      const type = ENEMY_TYPES[typeIndex];
      const homeY = topMargin + row * rowSpacing;

      for (let col = 0; col < config.cols; col++) {
        const homeX = colWidth * col + colWidth / 2;
        const textureKey = this.drawingTextureKeys[textureIndex % this.drawingTextureKeys.length];
        textureIndex++;

        const enterFromLeft = col < config.cols / 2;
        const spawnX = enterFromLeft ? -40 : this.scene.scale.width + 40;
        const spawnY = -40;

        const enemy = new Enemy(this.scene, textureKey, spawnX, spawnY, type);
        enemy.homeX = homeX;
        enemy.homeY = homeY;
        this.enemyGroup.add(enemy.sprite);
        this.activeEnemies.push(enemy);

        const path = new Phaser.Curves.Path(spawnX, spawnY);
        path.quadraticBezierTo(
          homeX,
          homeY,
          enterFromLeft ? homeX - 60 : homeX + 60,
          homeY - 120
        );

        const durationMs = ENTRANCE_BASE_DURATION_MS / type.speedMultiplier;
        this.scene.time.delayedCall(spawnDelay, () => {
          enemy.enterAlong(path, durationMs, () => {});
        });
        spawnDelay += ENTRANCE_STAGGER_MS;
      }
    }

    this.diveTimer = this.scene.time.addEvent({
      delay: config.diveIntervalMs,
      loop: true,
      callback: () => this.triggerDive(),
    });
  }

  removeEnemy(enemy: Enemy): void {
    const before = this.activeEnemies.length;
    this.activeEnemies = this.activeEnemies.filter((e) => e !== enemy);
    if (this.activeEnemies.length === before) return;
    if (this.activeEnemies.length === 0) {
      this.diveTimer?.remove();
      this.onWaveClear();
    }
  }

  destroy(): void {
    this.diveTimer?.remove();
    this.activeEnemies = [];
  }

  // Dive concurrency isn't capped: a dive+return cycle's duration is
  // DIVE_BASE_DURATION_MS / speedMultiplier (here) plus RETURN_DURATION_MS /
  // speedMultiplier (enemy.ts), and at higher levels that total can outlast
  // diveIntervalMs -- e.g. the slowest type (Comandante, speedMultiplier
  // 0.6) takes ~(1600 + 700) / 0.6 ≈ 3833ms per cycle, which already exceeds
  // level 1's diveIntervalMs of 3200ms. So more than one enemy may end up
  // diving/returning at the same time as levels ramp up -- this is
  // intentional escalation, not a bug, and triggerDive() only requires that
  // at least one enemy is currently HOLDING (idle) before picking a diver.
  private triggerDive(): void {
    const holding = this.activeEnemies.filter((e) => e.state === 'HOLDING');
    if (holding.length === 0) return;

    const enemy = Phaser.Utils.Array.GetRandom(holding);
    const player = this.getPlayerPosition();
    const durationMs = DIVE_BASE_DURATION_MS / enemy.type.speedMultiplier;
    enemy.diveAt(player.x, player.y, durationMs, () => {});
  }
}
