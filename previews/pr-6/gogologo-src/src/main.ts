import Phaser from 'phaser';
import { GAME_CONFIG } from './config/game-config';
import { audioManager } from './systems/audio-manager';

const game = new Phaser.Game(GAME_CONFIG);

// Web Audio requires a real user gesture before it can start making sound
// on Safari/iOS (and under Chrome's autoplay policy) -- resume the shared
// AudioContext on the first pointerdown/keydown the game receives.
audioManager.attachResumeOnFirstGesture(game);

// Exposed for Playwright-driven verification throughout this plan's tasks.
// Harmless — this is a public arcade game with no sensitive state.
(window as unknown as { __gogologoGame: Phaser.Game }).__gogologoGame = game;
