import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';
import {
  getPixelationEnabled,
  setPixelationEnabled,
  applyPixelationSetting,
  PIXELATE_AMOUNT,
} from '../systems/settings-manager';
import { getAudioEnabled, setAudioEnabled, audioManager } from '../systems/audio-manager';
import { HUD_TEXT_COLOR, HUD_TEXT_COLOR_SECONDARY } from '../config/visual-config';

const pixelateLabel = (enabled: boolean): string => `Pixelate: ${enabled ? 'ON' : 'OFF'}`;
const soundLabel = (enabled: boolean): string => `Sound: ${enabled ? 'ON' : 'OFF'}`;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GOGOLOGO', { fontSize: '32px', color: HUD_TEXT_COLOR }).setOrigin(0.5);
    this.add
      .text(cx, cy, `Best: ${getBestScore()}`, { fontSize: '16px', color: HUD_TEXT_COLOR_SECONDARY })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to start', { fontSize: '16px', color: HUD_TEXT_COLOR })
      .setOrigin(0.5);

    let pixelateFx = applyPixelationSetting(this.cameras.main);

    // Small, unobtrusive corner toggle -- tucked away from the main
    // start-game tap target and the title/score text.
    const pixelateButton = this.add
      .text(this.scale.width - 10, 10, pixelateLabel(getPixelationEnabled()), {
        fontSize: '12px',
        color: HUD_TEXT_COLOR_SECONDARY,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    pixelateButton.on('pointerdown', () => {
      const enabled = !getPixelationEnabled();
      setPixelationEnabled(enabled);
      pixelateButton.setText(pixelateLabel(enabled));

      if (enabled) {
        pixelateFx = this.cameras.main.postFX.addPixelate(PIXELATE_AMOUNT);
      } else if (pixelateFx) {
        this.cameras.main.postFX.remove(pixelateFx);
        pixelateFx = null;
      }
    });

    // Second small toggle, stacked just below the pixelate one -- same
    // out-of-the-way corner, same guard pattern against the tap-to-start
    // listener below.
    const soundButton = this.add
      .text(this.scale.width - 10, 28, soundLabel(getAudioEnabled()), {
        fontSize: '12px',
        color: HUD_TEXT_COLOR_SECONDARY,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    soundButton.on('pointerdown', () => {
      const enabled = !getAudioEnabled();
      setAudioEnabled(enabled);
      soundButton.setText(soundLabel(enabled));
    });

    // Resuming the background loop here means it's already playing by the
    // time CharacterSelectScene/GameScene start.
    audioManager.startMusic();

    const startGame = (): void => {
      this.scene.start('CharacterSelectScene');
    };

    // The scene-wide "tap anywhere to start" listener would otherwise also
    // fire on a tap that lands on the pixelate/sound buttons (Phaser's
    // global pointerdown event fires for every pointerdown, on top of each
    // button's own). Check the pointer against both buttons' bounds and,
    // if it's a hit, just re-arm the listener instead of starting.
    const handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (
        Phaser.Geom.Rectangle.Contains(pixelateButton.getBounds(), pointer.x, pointer.y) ||
        Phaser.Geom.Rectangle.Contains(soundButton.getBounds(), pointer.x, pointer.y)
      ) {
        this.input.once('pointerdown', handlePointerDown);
        return;
      }
      startGame();
    };

    this.input.once('pointerdown', handlePointerDown);
    this.input.keyboard?.once('keydown-SPACE', startGame);
  }
}
