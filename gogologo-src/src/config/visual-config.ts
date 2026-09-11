// Central "mainframe" for gogologo's visual tuning: background, sprite
// sizes, and the color palette. Edit values here instead of hunting
// through scene/entity files for magic numbers -- every file below
// imports from here rather than declaring its own copy.

// Canvas background (Phaser accepts backgroundColor as a CSS-style string).
export const BACKGROUND_COLOR = '#111111';

// Sprite display sizes (see player.ts / enemy.ts -- native drawing images
// are scaled to fit these target widths, aspect ratio preserved).
export const PLAYER_TARGET_WIDTH = 110;
export const ENEMY_TARGET_WIDTH = 85;

// Shared Peruvian/16-bit accent red -- the fire button, the enemy tint
// palette's first entry, and (not yet wired up) the character-select
// highlight all use this same red.
export const ACCENT_COLOR = 0xd91023;

// Enemy tint palette, cycled per spawn: flag red (ACCENT_COLOR), Inca
// gold, Andean turquoise, textile purple, sunset orange, highland green.
export const ENEMY_TINT_PALETTE = [ACCENT_COLOR, 0xf2b705, 0x1abc9c, 0x8e44ad, 0xff7f11, 0x4caf50];

// HUD text colors, used across MenuScene / GameScene / GameOverScene.
export const HUD_TEXT_COLOR = '#ffffff';
export const HUD_TEXT_COLOR_SECONDARY = '#cccccc';
export const GAME_OVER_TEXT_COLOR = '#ff0000';
