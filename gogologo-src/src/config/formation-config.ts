// Per-level wave tuning for FormationManager. Columns stay fixed (width-safe
// for the 480px canvas shared by mobile and desktop -- see layout-config.ts);
// rows grow and the dive timer speeds up as level increases, each capped so
// the game never asks for an impossible grid or an impossible cadence.

export interface LevelConfig {
  rows: number;
  cols: number;
  diveIntervalMs: number;
}

const BASE_ROWS = 3;
const MAX_ROWS = 6;
const COLS = 4;
// 3200ms at level 1 keeps clear margin above the worst-case entrance
// choreography settle time (~2550ms for a 3x4 grid, see formation-manager.ts)
// so the dive timer never fires mid-entrance.
const BASE_DIVE_INTERVAL_MS = 3200;
const MIN_DIVE_INTERVAL_MS = 900;
const DIVE_INTERVAL_STEP_MS = 250;

export function levelConfig(level: number): LevelConfig {
  return {
    rows: Math.min(BASE_ROWS + Math.floor((level - 1) / 2), MAX_ROWS),
    cols: COLS,
    diveIntervalMs: Math.max(
      MIN_DIVE_INTERVAL_MS,
      BASE_DIVE_INTERVAL_MS - (level - 1) * DIVE_INTERVAL_STEP_MS
    ),
  };
}
