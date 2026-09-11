import Phaser from 'phaser';
import { createInputController, InputController, CONTROL_ZONE_HEIGHT } from '../systems/input-system';
import { Player } from '../entities/player';
import { Enemy, ENEMY_SPEED } from '../entities/enemy';
import { setBestScoreIfHigher } from '../systems/save-manager';

const ENEMY_SPAWN_INTERVAL_MS = 1000;
const STARTING_LIVES = 3;
// Keeps the player clear of the touch control strip (CONTROL_ZONE_HEIGHT)
// reserved at the bottom of the canvas, so the ship sits visibly above the
// tap area instead of overlapping it.
const PLAYER_BOTTOM_MARGIN = 60;

// Fixed tint palette for enemy sprites, matching the game's Peruvian/16-bit
// theme: flag red (shared with the fire button), Inca gold, Andean
// turquoise, textile purple, sunset orange, and highland green. Chosen for
// hue separation and readability against the #111111 background.
const ENEMY_TINT_PALETTE = [0xd91023, 0xf2b705, 0x1abc9c, 0x8e44ad, 0xff7f11, 0x4caf50];

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drawingTextureKeys!: string[];
  private nextEnemyTextureIndex = 0;
  private nextEnemyTintIndex = 0;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private score = 0;
  private lives = STARTING_LIVES;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 10);
    graphics.generateTexture('projectile', 4, 10);
    graphics.destroy();

    this.drawingTextureKeys = this.registry.get('drawingTextureKeys') as string[];
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.nextEnemyTextureIndex = 1;
    this.nextEnemyTintIndex = 0;

    this.player = new Player(
      this,
      this.drawingTextureKeys[0],
      this.scale.width / 2,
      this.scale.height - CONTROL_ZONE_HEIGHT - PLAYER_BOTTOM_MARGIN
    );
    this.inputController = createInputController(this);

    this.enemies = this.physics.add.group();
    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', color: '#ffffff' });
    this.livesText = this.add.text(10, 30, `Lives: ${this.lives}`, {
      fontSize: '16px',
      color: '#ffffff',
    });

    this.physics.add.overlap(this.player.getProjectiles(), this.enemies, (projectile, enemy) =>
      this.handleProjectileHitsEnemy(
        projectile as Phaser.Physics.Arcade.Sprite,
        enemy as Phaser.Physics.Arcade.Sprite
      )
    );

    this.physics.add.overlap(this.player.sprite, this.enemies, (_player, enemy) =>
      this.handleEnemyHitsPlayer(enemy as Phaser.Physics.Arcade.Sprite)
    );
  }

  update(): void {
    this.player.moveToX(this.inputController.getTargetX(this.player.sprite.x));
    if (this.inputController.isFiring()) {
      this.player.fire();
    }

    this.enemies.getChildren().slice().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.y > this.scale.height + 32) {
        enemy.destroy();
        this.loseLife();
      }
    });

    this.player.getProjectiles().getChildren().slice().forEach((child) => {
      const projectile = child as Phaser.Physics.Arcade.Sprite;
      if (projectile.y < -20) {
        projectile.destroy();
      }
    });
  }

  private spawnEnemy(): void {
    const textureKey =
      this.drawingTextureKeys[this.nextEnemyTextureIndex % this.drawingTextureKeys.length];
    this.nextEnemyTextureIndex++;
    const tintColor = ENEMY_TINT_PALETTE[this.nextEnemyTintIndex % ENEMY_TINT_PALETTE.length];
    this.nextEnemyTintIndex++;
    const x = Phaser.Math.Between(32, this.scale.width - 32);
    const enemy = new Enemy(this, textureKey, x, -32, tintColor);
    // Phaser.Physics.Arcade.Group#add always re-applies the group's
    // defaults (velocityY: 0, since none is configured on this group) via
    // its internalCreateCallback, overwriting the downward velocity Enemy's
    // constructor just set. Re-apply it after adding so enemies actually fall.
    this.enemies.add(enemy.sprite);
    enemy.sprite.setVelocityY(ENEMY_SPEED);
  }

  private handleProjectileHitsEnemy(
    projectile: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite
  ): void {
    projectile.destroy();
    enemy.destroy();
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private handleEnemyHitsPlayer(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.destroy();
    this.loseLife();
  }

  private loseLife(): void {
    if (this.lives <= 0) return;
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) {
      this.spawnTimer.remove();
      setBestScoreIfHigher(this.score);
      this.scene.start('GameOverScene', { score: this.score });
    }
  }
}
