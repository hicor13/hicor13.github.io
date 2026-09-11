// Player and enemy gameplay/visual tuning -- separate from visual-config.ts
// (pure UI/background colors) since these values affect gameplay, not just
// appearance. Edit values here to customize the player ship or add/adjust
// enemy types.

export const PLAYER_CONFIG = {
  targetWidth: 110,
  moveSpeed: 300, // pixels per second, keyboard movement
  fireCooldownMs: 350,
  projectileSpeed: 500, // pixels per second, upward
};

export interface EnemyType {
  name: string;
  targetWidth: number;
  // Divides entrance/dive tween durations in formation-manager.ts -- 1.0 =
  // base duration, >1 faster (shorter duration), <1 slower.
  speedMultiplier: number;
  points: number;
  tintColor: number;
}

// Pixels per second, downward, at REFERENCE_HEIGHT (see layout-config.ts) --
// each type's actual fall speed is ENEMY_BASE_SPEED * speedMultiplier,
// further scaled by canvas height at spawn time. Superseded by
// formation-manager.ts's tween-duration model (Task 2/3 of the enemy-
// formations plan) -- remove once entities/enemy.ts no longer imports this.
export const ENEMY_BASE_SPEED = 80;

// Four tiers, small/fast/cheap to big/slow/valuable -- same tradeoff as
// classic Galaga's enemy ranks. Colors drawn from the game's established
// Peruvian/16-bit palette.
export const ENEMY_TYPES: EnemyType[] = [
  { name: 'Colibrí', targetWidth: 60, speedMultiplier: 1.4, points: 10, tintColor: 0x1abc9c },
  { name: 'Cóndor', targetWidth: 85, speedMultiplier: 1.0, points: 20, tintColor: 0xf2b705 },
  { name: 'Puma', targetWidth: 100, speedMultiplier: 0.8, points: 30, tintColor: 0x8e44ad },
  { name: 'Comandante', targetWidth: 120, speedMultiplier: 0.6, points: 50, tintColor: 0xd91023 },
];
