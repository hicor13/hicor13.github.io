import Phaser from 'phaser';
import { createInputController, InputController, CONTROL_ZONE_HEIGHT } from '../systems/input-system';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { FormationManager } from '../systems/formation-manager';
import { levelConfig } from '../config/formation-config';
import { setBestScoreIfHigher } from '../systems/save-manager';
import { HUD_TEXT_COLOR } from '../config/visual-config';

const STARTING_LIVES = 3;
// Keeps the player clear of the touch control strip (CONTROL_ZONE_HEIGHT)
// reserved at the bottom of the canvas, so the ship sits visibly above the
// tap area instead of overlapping it. Desktop (no touch, no control strip)
// only needs the plain bottom margin -- see playerY() below.
const PLAYER_BOTTOM_MARGIN = 60;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drawingTextureKeys!: string[];
  private formationManager!: FormationManager;
  private level = 1;
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
    this.level = 1;

    this.player = new Player(this, this.drawingTextureKeys[0], this.scale.width / 2, this.playerY());
    this.inputController = createInputController(this);

    this.enemies = this.physics.add.group();
    this.formationManager = new FormationManager(
      this,
      this.enemies,
      this.drawingTextureKeys,
      () => ({ x: this.player.sprite.x, y: this.player.sprite.y }),
      () => this.handleWaveClear()
    );
    this.formationManager.startWave(levelConfig(this.level));

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', color: HUD_TEXT_COLOR });
    this.livesText = this.add.text(10, 30, `Lives: ${this.lives}`, {
      fontSize: '16px',
      color: HUD_TEXT_COLOR,
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

    this.player.getProjectiles().getChildren().slice().forEach((child) => {
      const projectile = child as Phaser.Physics.Arcade.Sprite;
      if (projectile.y < -20) {
        projectile.destroy();
      }
    });
  }

  private playerY(): number {
    // Touch devices reserve a control strip at the bottom for the fire
    // button (see input-system.ts) -- the player must sit above it.
    // Desktop has no touch controls at all, so no strip to clear.
    const isTouchCapable = 'ontouchstart' in window;
    const reservedHeight = isTouchCapable ? CONTROL_ZONE_HEIGHT : 0;
    return this.scale.height - reservedHeight - PLAYER_BOTTOM_MARGIN;
  }

  private handleWaveClear(): void {
    this.level++;
    this.formationManager.startWave(levelConfig(this.level));
  }

  private handleProjectileHitsEnemy(
    projectile: Phaser.Physics.Arcade.Sprite,
    enemySprite: Phaser.Physics.Arcade.Sprite
  ): void {
    projectile.destroy();
    const points = (enemySprite.getData('points') as number | undefined) ?? 0;
    const enemyRef = enemySprite.getData('enemyRef') as Enemy;
    enemyRef.destroy();
    this.formationManager.removeEnemy(enemyRef);
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private handleEnemyHitsPlayer(enemySprite: Phaser.Physics.Arcade.Sprite): void {
    const enemyRef = enemySprite.getData('enemyRef') as Enemy;
    enemyRef.destroy();
    this.formationManager.removeEnemy(enemyRef);
    this.loseLife();
  }

  private loseLife(): void {
    if (this.lives <= 0) return;
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) {
      this.formationManager.destroy();
      setBestScoreIfHigher(this.score);
      this.scene.start('GameOverScene', { score: this.score });
    }
  }
}
