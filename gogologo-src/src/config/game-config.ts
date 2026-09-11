import Phaser from 'phaser';
import { BootScene } from '../scenes/boot-scene';
import { PreloadScene } from '../scenes/preload-scene';
import { MenuScene } from '../scenes/menu-scene';
import { CharacterSelectScene } from '../scenes/character-select-scene';
import { GameScene } from '../scenes/game-scene';
import { GameOverScene } from '../scenes/game-over-scene';
import { BACKGROUND_COLOR } from './visual-config';
import { MOBILE_CONFIG, DESKTOP_CONFIG } from './layout-config';

// Same 'ontouchstart' in window convention used everywhere else in this
// game (input-system.ts, character-select-scene.ts) -- touch devices get
// the tall phone-tuned canvas, non-touch (desktop/laptop) gets the 3:4
// desktop canvas.
const isTouchCapable = 'ontouchstart' in window;
const { width, height } = isTouchCapable ? MOBILE_CONFIG : DESKTOP_CONFIG;

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width,
  height,
  backgroundColor: BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, GameScene, GameOverScene],
};
