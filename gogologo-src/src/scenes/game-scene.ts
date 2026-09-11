import Phaser from 'phaser';
import { createInputController, InputController } from '../systems/input-system';
import { Player } from '../entities/player';
import { Enemy, ENEMY_SPEED } from '../entities/enemy';
import { setBestScoreIfHigher } from '../systems/save-manager';

const ENEMY_SPAWN_INTERVAL_MS = 1000;
const STARTING_LIVES = 3;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drawingTextureKeys!: string[];
  private nextEnemyTextureIndex = 0;
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
    this.nextEnemyTextureIndex = 0;

    this.player = new Player(
      this,
      this.drawingTextureKeys[0],
      this.scale.width / 2,
      this.scale.height - 60
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

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.y > this.scale.height + 32) {
        enemy.destroy();
        this.loseLife();
      }
    });
  }

  private spawnEnemy(): void {
    const textureKey =
      this.drawingTextureKeys[this.nextEnemyTextureIndex % this.drawingTextureKeys.length];
    this.nextEnemyTextureIndex++;
    const x = Phaser.Math.Between(32, this.scale.width - 32);
    const enemy = new Enemy(this, textureKey, x, -32);
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
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) {
      this.spawnTimer.remove();
      setBestScoreIfHigher(this.score);
      this.scene.start('GameOverScene', { score: this.score });
    }
  }
}
