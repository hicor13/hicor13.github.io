import Phaser from 'phaser';
import { GAME_CONFIG } from './config/game-config';

const game = new Phaser.Game(GAME_CONFIG);

// Exposed for Playwright-driven verification throughout this plan's tasks.
// Harmless — this is a public arcade game with no sensitive state.
(window as unknown as { __gogologoGame: Phaser.Game }).__gogologoGame = game;
