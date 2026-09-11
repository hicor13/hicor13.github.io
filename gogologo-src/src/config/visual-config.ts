// Central "mainframe" for gogologo's UI/background colors. Edit values here
// instead of hunting through scene files for magic numbers. Player/enemy
// gameplay and sprite-sizing tuning lives in entity-config.ts instead --
// this file is UI-only.

// Canvas background (Phaser accepts backgroundColor as a CSS-style string).
export const BACKGROUND_COLOR = '#111111';

// Shared Peruvian/16-bit accent red -- the fire button and the
// character-select highlight both use this same red.
export const ACCENT_COLOR = 0xd91023;

// HUD text colors, used across MenuScene / GameScene / GameOverScene /
// CharacterSelectScene.
export const HUD_TEXT_COLOR = '#ffffff';
export const HUD_TEXT_COLOR_SECONDARY = '#cccccc';
export const GAME_OVER_TEXT_COLOR = '#ff0000';
