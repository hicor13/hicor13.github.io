import Phaser from 'phaser';
import { BootScene } from '../scenes/boot-scene';
import { PreloadScene } from '../scenes/preload-scene';
import { MenuScene } from '../scenes/menu-scene';
import { CharacterSelectScene } from '../scenes/character-select-scene';
import { GameScene } from '../scenes/game-scene';
import { GameOverScene } from '../scenes/game-over-scene';
import { BACKGROUND_COLOR } from './visual-config';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 1040,
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
