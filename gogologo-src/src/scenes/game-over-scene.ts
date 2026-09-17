import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';
import { applyPixelationSetting } from '../systems/settings-manager';
import { submitScore, fetchTopScores, LEADERBOARD_NAME_MAX_LENGTH } from '../systems/leaderboard-client';
import { HUD_TEXT_COLOR, HUD_TEXT_COLOR_SECONDARY, GAME_OVER_TEXT_COLOR, ACCENT_COLOR } from '../config/visual-config';

const LEADERBOARD_DISPLAY_COUNT = 8;
const RESTART_ARM_DELAY_MS = 600;

export class GameOverScene extends Phaser.Scene {
  // Tracked so a scene shutdown (restart, or any other transition away from
  // this scene) always cleans up a still-open DOM input overlay -- it lives
  // outside Phaser's own display list so nothing else would remove it.
  private nameInput: HTMLInputElement | null = null;

  constructor() {
    super('GameOverScene');
  }

  create(data: { score: number }): void {
    applyPixelationSetting(this.cameras.main);

    const cx = this.scale.width / 2;
    let y = this.scale.height / 2 - 220;
    const lineGap = 34;

    this.add.text(cx, y, 'GAME OVER', { fontSize: '28px', color: GAME_OVER_TEXT_COLOR }).setOrigin(0.5);
    y += lineGap;
    this.add
      .text(cx, y, `Score: ${data.score}`, { fontSize: '18px', color: HUD_TEXT_COLOR })
      .setOrigin(0.5);
    y += 28;
    this.add
      .text(cx, y, `Best: ${getBestScore()}`, { fontSize: '18px', color: HUD_TEXT_COLOR_SECONDARY })
      .setOrigin(0.5);
    y += lineGap;

    this.events.once('shutdown', () => this.removeNameInput());

    this.runNameEntryAndLeaderboard(data.score, cx, y);
  }

  private armRestart(): void {
    const restart = (): void => {
      this.scene.start('GameScene');
    };
    this.time.delayedCall(RESTART_ARM_DELAY_MS, () => {
      this.input.once('pointerdown', restart);
      this.input.keyboard?.once('keydown-SPACE', restart);
    });
  }

  private async runNameEntryAndLeaderboard(score: number, cx: number, startY: number): Promise<void> {
    let y = startY;

    const promptText = this.add
      .text(cx, y, 'Enter your initials:', { fontSize: '14px', color: HUD_TEXT_COLOR_SECONDARY })
      .setOrigin(0.5);
    y += 40;

    const name = await this.promptForName(cx, y);
    promptText.destroy();
    y += 10;

    if (name) {
      const submitted = await submitScore(name, score);
      if (submitted) {
        this.add
          .text(cx, y, `${name} -- ${score}`, { fontSize: '14px', color: HUD_TEXT_COLOR })
          .setOrigin(0.5);
        y += 30;
      }
    }

    const topScores = await fetchTopScores(LEADERBOARD_DISPLAY_COUNT);
    if (topScores.length > 0) {
      this.add
        .text(cx, y, 'TOP SCORES', { fontSize: '16px', color: HUD_TEXT_COLOR })
        .setOrigin(0.5);
      y += 26;
      topScores.forEach((entry, index) => {
        this.add
          .text(cx, y, `${index + 1}. ${entry.name}  ${entry.score}`, {
            fontSize: '13px',
            color: HUD_TEXT_COLOR_SECONDARY,
          })
          .setOrigin(0.5);
        y += 20;
      });
      y += 14;
    }

    this.add
      .text(cx, y, 'Tap or press Space to restart', { fontSize: '16px', color: HUD_TEXT_COLOR })
      .setOrigin(0.5);

    this.armRestart();
  }

  // Phaser has no native text-input widget, so this overlays a real DOM
  // <input> on top of the canvas at the given Phaser-space coordinates --
  // works with both an on-screen keyboard (touch) and a physical one, which
  // a Phaser-drawn letter-cycling input would need much more code to match.
  // Resolves with the trimmed/uppercased name (possibly '') once the player
  // presses Enter or the input loses focus; never rejects.
  private promptForName(phaserX: number, phaserY: number): Promise<string> {
    return new Promise((resolve) => {
      let settled = false;
      let input: HTMLInputElement;

      try {
        input = document.createElement('input');
      } catch {
        // No DOM available (shouldn't happen in a browser game, but this
        // must never throw into the game-over flow) -- skip name entry.
        resolve('');
        return;
      }

      const canvas = this.game.canvas as HTMLCanvasElement | undefined;
      const rect = canvas?.getBoundingClientRect();
      const scaleFactor = rect ? rect.width / this.scale.width : 1;
      const screenX = (rect?.left ?? 0) + phaserX * scaleFactor;
      const screenY = (rect?.top ?? 0) + phaserY * scaleFactor;

      input.type = 'text';
      input.maxLength = LEADERBOARD_NAME_MAX_LENGTH;
      input.autocapitalize = 'characters';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.spellcheck = false;
      Object.assign(input.style, {
        position: 'fixed',
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)',
        width: `${Math.max(80, 24 * scaleFactor)}px`,
        fontSize: `${Math.max(14, 18 * scaleFactor)}px`,
        letterSpacing: '0.3em',
        textAlign: 'center',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
        color: HUD_TEXT_COLOR,
        background: '#000000',
        border: `2px solid #${ACCENT_COLOR.toString(16).padStart(6, '0')}`,
        borderRadius: '4px',
        padding: '4px 2px',
        zIndex: '1000',
        outline: 'none',
      });

      document.body.appendChild(input);
      this.nameInput = input;
      input.focus();

      const finish = (): void => {
        if (settled) return;
        settled = true;
        const value = input.value.trim().toUpperCase().slice(0, LEADERBOARD_NAME_MAX_LENGTH);
        this.removeNameInput();
        resolve(value);
      };

      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().slice(0, LEADERBOARD_NAME_MAX_LENGTH);
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') finish();
      });
      input.addEventListener('blur', finish);
    });
  }

  private removeNameInput(): void {
    if (this.nameInput && this.nameInput.parentNode) {
      this.nameInput.parentNode.removeChild(this.nameInput);
    }
    this.nameInput = null;
  }
}
