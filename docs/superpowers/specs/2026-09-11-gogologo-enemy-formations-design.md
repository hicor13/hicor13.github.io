# Gogologo — Enemy Formations & Attack AI (Sub-project 3) — Design

## Context

Sub-projects 1 (core engine), 2 (character select), and the mobile UX,
visual-config, desktop-layout, and entity-customization work that
followed are complete and live at `mariocornejo.com/gogologo/`. Today's
enemy behavior in `GameScene` (`spawnEnemy()`,
`scenes/game-scene.ts:106`) is flat: a timer fires every
`ENEMY_SPAWN_INTERVAL_MS` (1000ms), spawns one enemy at a random x
just above the top edge, cycling round-robin through the 4
`ENEMY_TYPES` (`config/entity-config.ts`), and it falls straight down
at `type.speedMultiplier * ENEMY_BASE_SPEED`, scaled by canvas height.
Reaching the bottom edge costs a life (`game-scene.ts:83-87`). There is
no grouping, no AI, no levels — the same difficulty runs forever.

This spec covers sub-project 3 from the original decomposition:
Galaga-style enemy formations — enemies enter in a choreographed
sweep, hold in a grid, individually peel off to dive-bomb the player,
then return to their slot — with difficulty escalating across cleared
waves ("levels"). Enemy projectiles are explicitly out of scope (see
below) — this sub-project is movement/AI/wave-state only.

## Goal

Replace the flat spawn-and-fall loop with a `FormationManager` that
drives a wave of enemies through an entrance choreography into a
grid, holds them there, periodically sends one diving at the player's
current position before it returns to its slot, and reports back to
`GameScene` when the wave is fully cleared so the next, harder level
can start.

## Scope

**In scope:** `systems/formation-manager.ts` (new); `EnemyState` and
path-follow methods added to `entities/enemy.ts`; `config/
formation-config.ts` (new, level/wave tuning); `GameScene` wiring
(replacing the spawn timer with `FormationManager` ownership, adding
`level` state); removing the bottom-edge-loses-a-life check.

**Out of scope:** Enemy projectiles/firing (confirmed — later
addition). Formation-wide movement (the grid itself sliding/shifting
while holding, as classic Galaga sometimes does) — slots are static
once entered. Multiple simultaneous diving enemies (one dive in
flight at a time, matching the fixed `diveIntervalMs` cadence below).
Any change to `Player`, `input-system.ts`, `CharacterSelectScene`, or
the projectile/collision mechanics already in place — those are
reused as-is.

## Design

### Enemy state machine

`entities/enemy.ts` gains:

```ts
type EnemyState = 'ENTERING' | 'HOLDING' | 'DIVING' | 'RETURNING';
```

Each `Enemy` tracks its own `state`, its assigned home slot
`(homeX, homeY)`, and exposes:

- `enterAlong(path: Phaser.Curves.Path, onComplete)` — tweens the
  sprite along the path (`ENTERING`), sets state to `HOLDING` and
  starts a small idle bob tween (position ± a few px, looping) on
  completion.
- `diveAt(targetX: number, targetY: number, onComplete)` — stops the
  bob tween, sets state `DIVING`, tweens along a `Phaser.Curves.Path`
  built from the enemy's current position through a control point
  toward `(targetX, targetY)` and back up past the screen edge on
  the entry side, then sets state `RETURNING` and tweens straight
  back to `(homeX, homeY)`, then `HOLDING` again (restarts the bob).
- Dive/entrance speed reuses each type's existing
  `speedMultiplier` (`config/entity-config.ts`) — previously a
  fall-speed multiplier, now a path-duration multiplier (faster type
  = shorter tween duration along the same path length). The
  `entity-config.ts` comment describing `speedMultiplier` gets
  updated to reflect this.

The sprite, its Arcade Physics body, tint, and `points` data are
unchanged from today — only x/y are now driven by tweens instead of
`setVelocityY`. Existing projectile-overlap and player-overlap
handlers keep working unmodified since both still read off
`enemy.sprite`.

On destroy (projectile hit or player collision), the owning code
must call `scene.tweens.killTweensOf(enemy.sprite)` before
`sprite.destroy()`, since a tween can still be mid-flight against any
state.

### Formation layout

Grid is `cols` (fixed at 4, width-safe for the 480px canvas shared by
mobile and desktop) × `rows` (grows with level, see Escalation).
Column spacing = `canvasWidth / cols` cols, centered. Row spacing is a
base pixel value scaled by `canvasHeight / REFERENCE_HEIGHT` — the
same scaling pattern `Enemy` already applies to fall speed
(`entities/enemy.ts:21`), reused here for row spacing so desktop's
shorter 640px canvas doesn't overflow.

Row 0 (topmost, entered first) uses the highest-value/slowest type
(Comandante); each row down steps to the next cheaper/faster type
(Puma, Cóndor, Colibrí); a 5th+ row (once `rows` grows past 4) cycles
the type sequence again from the top. This mirrors classic Galaga's
tiering — tougher/rarer enemies sit toward the back.

### Entrance choreography

At wave start, enemies spawn off-screen (alternating left/right of
the canvas, just above the top edge) and enter with a ~150ms stagger
between each one, so the grid fills in visibly rather than all at
once. Each entrance path is a `Phaser.Curves.QuadraticBezier` from
the spawn point, through a control point that arcs the path out and
back, into the assigned `(homeX, homeY)` slot.

### Dive AI

`FormationManager` runs its own repeating timer at `diveIntervalMs`
(from the level config). Each tick:
1. Filter the wave's active enemy list to `state === 'HOLDING'`.
2. If empty (all diving/returning/dead), skip this tick.
3. Pick one at random, snapshot the player's current
   `(x, y)`, and call `enemy.diveAt(playerX, playerY, ...)`.

Only one enemy dives at a time — the next tick simply won't find a
new dive target if the current diver hasn't returned to `HOLDING`
yet in time, naturally throttling concurrency without extra state.

### Wave/level state

`FormationManager` keeps a flat `Enemy[]` of everything alive in the
current wave (regardless of state). `GameScene`'s existing
projectile-hit and player-hit handlers, after destroying an enemy,
remove it from that list via a callback. When the list is empty, the
manager fires `onWaveClear()`.

`config/formation-config.ts`:

```ts
export interface LevelConfig {
  rows: number;
  cols: number;
  diveIntervalMs: number;
}

const BASE_ROWS = 3;
const MAX_ROWS = 6;
const COLS = 4;

export function levelConfig(level: number): LevelConfig {
  return {
    rows: Math.min(BASE_ROWS + Math.floor((level - 1) / 2), MAX_ROWS),
    cols: COLS,
    diveIntervalMs: Math.max(900, 2500 - (level - 1) * 250),
  };
}
```

(Exact constants are tunable during implementation — this fixes the
shape: rows grow every other level up to a cap, dive interval shrinks
per level down to a floor, columns stay fixed for width safety.)

`GameScene.create()` starts at `level = 1`, calls
`formationManager.startWave(levelConfig(level))`. On `onWaveClear`,
increments `level` and starts the next wave. `spawnEnemy()` and
`ENEMY_SPAWN_INTERVAL_MS` are removed.

### Removed: bottom-edge life loss

`game-scene.ts:83-87`'s "enemy crosses the bottom edge → lose a
life" check is removed. Formation enemies only reach the player's
half of the screen during a deliberate dive, and a dive that reaches
the player is already covered by the existing player-overlap
collision (`handleEnemyHitsPlayer`, `game-scene.ts:133`). Enemies no
longer fall indefinitely, so the check has no remaining case to
catch.

## Testing

No test framework in this repo's Phaser/Vite source (confirmed:
`gogologo-src/package.json` has only `dev`/`build`/`typecheck`/
`preview` scripts, no test runner, no CI anywhere in the repo).
Manual verification via `npm run dev` + Playwright MCP, per this
project's established convention: entrance paths land all enemies
into a clean, non-overlapping grid with visible stagger; holding
enemies bob in place without drifting from their slot; dives fire on
the configured interval and curve toward the player's position at
peel-off time; a killed enemy (in any state) is removed from the
wave's active list with no leftover tween errors in the console; wave
clear correctly advances `level` and the next wave spawns with more
rows and a shorter dive interval; existing score/lives/collision
behavior (player hit by a diving enemy, projectile kills an enemy)
still works; the removed bottom-edge check causes no regression on
either mobile (`window.ontouchstart` forced non-null per this
project's existing technique) or desktop layout, since both share the
480px-wide canvas the grid math assumes.
