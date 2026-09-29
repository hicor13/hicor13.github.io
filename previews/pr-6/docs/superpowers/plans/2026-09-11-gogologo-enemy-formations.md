# Gogologo Enemy Formations & Attack AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `GameScene`'s flat spawn-and-fall enemy loop with a `FormationManager` that choreographs a wave of enemies into a grid, holds them there, periodically dives one at the player's current position before returning it to its slot, and reports wave-clear back to `GameScene` so a harder level can start.

**Architecture:** Two new files — `config/formation-config.ts` (pure `levelConfig(level)` function, no Phaser dependency) and `systems/formation-manager.ts` (owns wave state: grid layout, entrance choreography, dive timer, active-enemy tracking, wave-clear detection). `entities/enemy.ts` is extended (not rewritten from scratch structurally) with an `EnemyState` machine and tween-based `enterAlong`/`diveAt` methods, replacing its old constant-velocity fall. `scenes/game-scene.ts` drops its spawn timer and bottom-edge-loses-a-life check, and instead owns a `FormationManager` instance plus a `level` counter.

**Tech Stack:** Phaser 3 (`Phaser.Curves.Path`, `Phaser.Tweens`, `Phaser.Time.TimerEvent`), TypeScript, Vite — same as the rest of `gogologo-src/`. No test framework in this repo (confirmed: `gogologo-src/package.json` has only `dev`/`build`/`typecheck`/`preview` scripts); verification is manual via `npm run dev` + Playwright MCP tools.

**Spec:** `docs/superpowers/specs/2026-09-11-gogologo-enemy-formations-design.md`

## Global Constraints

- Work happens on branch `pv1` in the deploy repo: `/Users/hicor13/Website/hicor13.github.io/hicor13.github.io`.
- After **every** task that touches `gogologo-src/`, run `npm run build` inside `gogologo-src/` before committing, and confirm `git status` shows `gogologo/assets/index-*.js` (and `gogologo/index.html` if its hash reference changed) as modified — this was missed once before and left the live site serving a stale bundle.
- Never `git commit` or `git push` without explicit user authorization for that specific commit — stage the files, show the exact message, wait for a yes, then commit.
- Canvas is `480×1040` (mobile, `MOBILE_CONFIG`) or `480×640` (desktop, `DESKTOP_CONFIG`) — `gogologo-src/src/config/layout-config.ts`. Grid/layout math must work at both; column count is fixed at 4 specifically because it's width-safe for both (they share the same 480px width).
- Enemy projectiles are out of scope — enemies never fire. Formation-wide drift (the grid itself sliding while holding) is out of scope — slots are static once entered. Only one enemy dives at a time; the dive timer simply skips a tick if no enemy is currently `HOLDING`, no separate concurrency cap needed.
- Row-to-type mapping: row 0 (topmost, entered first) is the highest-value/slowest type (`Comandante`), stepping down to the cheapest/fastest (`Colibrí`) by row 3, cycling again from row 4 on. `config/entity-config.ts`'s `ENEMY_TYPES` array is ordered cheap→valuable (`Colibrí` at index 0, `Comandante` at index 3), so row→type is `ENEMY_TYPES[(ENEMY_TYPES.length - 1 - (row % ENEMY_TYPES.length) + ENEMY_TYPES.length) % ENEMY_TYPES.length]`.
- This repo has hit stale-cache false positives re-navigating to an already-visited URL in the same Playwright session — always append a fresh cache-busting query string (`?cb=...`) on re-navigation.
- `tsconfig.json` has `"strict": true` — optional/nullable fields need explicit `?` or `| undefined`, as written in the code blocks below.

---

### Task 1: `formation-config.ts` + `entity-config.ts` comment update

**Files:**
- Create: `gogologo-src/src/config/formation-config.ts`
- Modify: `gogologo-src/src/config/entity-config.ts:16-19` (the `speedMultiplier` doc comment)

**Interfaces:**
- Consumes: `EnemyType`/`ENEMY_TYPES` shape from `entity-config.ts` (unchanged this task).
- Produces: `export interface LevelConfig { rows: number; cols: number; diveIntervalMs: number }` and `export function levelConfig(level: number): LevelConfig` — consumed by Task 3's `FormationManager.startWave()` and Task 4's `GameScene`.

- [ ] **Step 1: Create `gogologo-src/src/config/formation-config.ts`**

```ts
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
```

- [ ] **Step 2: Modify `gogologo-src/src/config/entity-config.ts`** — update the `speedMultiplier` doc comment (currently describes it as a fall-speed multiplier; sub-project 3 repurposes it as a tween-duration multiplier)

Change:
```ts
export interface EnemyType {
  name: string;
  targetWidth: number;
  // Relative to ENEMY_BASE_SPEED -- 1.0 = base speed, >1 faster, <1 slower.
  speedMultiplier: number;
  points: number;
  tintColor: number;
}
```
to:
```ts
export interface EnemyType {
  name: string;
  targetWidth: number;
  // Divides entrance/dive tween durations in formation-manager.ts -- 1.0 =
  // base duration, >1 faster (shorter duration), <1 slower.
  speedMultiplier: number;
  points: number;
  tintColor: number;
}
```

Also update the file's top-of-module comment (`entity-config.ts:1-4`) and the `ENEMY_BASE_SPEED` comment block (`entity-config.ts:22-25`), which still describe straight-line falling — this constant is no longer used after Task 4 removes the last caller:

Change:
```ts
// Pixels per second, downward, at REFERENCE_HEIGHT (see layout-config.ts) --
// each type's actual fall speed is ENEMY_BASE_SPEED * speedMultiplier,
// further scaled by canvas height at spawn time (see enemy.ts).
export const ENEMY_BASE_SPEED = 80;
```
to a comment noting it's now dead once Task 4 lands (do not delete it in this task — `enemy.ts` still imports and uses it until Task 2 rewrites that file):
```ts
// Pixels per second, downward, at REFERENCE_HEIGHT (see layout-config.ts) --
// each type's actual fall speed is ENEMY_BASE_SPEED * speedMultiplier,
// further scaled by canvas height at spawn time. Superseded by
// formation-manager.ts's tween-duration model (Task 2/3 of the enemy-
// formations plan) -- remove once entities/enemy.ts no longer imports this.
export const ENEMY_BASE_SPEED = 80;
```

- [ ] **Step 3: Verify `levelConfig()` against the formula**

With `npm run dev` running in `gogologo-src/`, navigate to `http://localhost:5173/?cb=fc1`. No need to wait for game boot — this is a pure module. Run:

```js
async () => {
  const mod = await import('/src/config/formation-config.ts');
  return [1, 2, 3, 4, 5, 8, 12].map((level) => ({ level, ...mod.levelConfig(level) }));
}
```

Expected:
```json
[
  { "level": 1, "rows": 3, "cols": 4, "diveIntervalMs": 3200 },
  { "level": 2, "rows": 3, "cols": 4, "diveIntervalMs": 2950 },
  { "level": 3, "rows": 4, "cols": 4, "diveIntervalMs": 2700 },
  { "level": 4, "rows": 4, "cols": 4, "diveIntervalMs": 2450 },
  { "level": 5, "rows": 5, "cols": 4, "diveIntervalMs": 2200 },
  { "level": 8, "rows": 6, "cols": 4, "diveIntervalMs": 1450 },
  { "level": 12, "rows": 6, "cols": 4, "diveIntervalMs": 900 }
]
```
(`rows` caps at 6 from level 7 on; `diveIntervalMs` floors at 900 from level 11 on.)

- [ ] **Step 4: Run `npm run build` and confirm the bundle changed**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src" && npm run build
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && git status --porcelain gogologo/
```
Expected: `gogologo/assets/index-*.js` listed as modified (new hash).

- [ ] **Step 5: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/config/formation-config.ts gogologo-src/src/config/entity-config.ts gogologo/
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add per-level formation config for wave grid/dive tuning

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GE7iPsqxRoQ9YMQ4YGcLHF
```

---

### Task 2: `Enemy` state machine + entrance/dive/return tweens

**Files:**
- Modify: `gogologo-src/src/entities/enemy.ts` (full rewrite of the class body)

**Interfaces:**
- Consumes: `EnemyType` from `entity-config.ts` (constructor param, unchanged shape).
- Produces (consumed by Task 3's `FormationManager`):
  - `export type EnemyState = 'ENTERING' | 'HOLDING' | 'DIVING' | 'RETURNING'`
  - `class Enemy`: public mutable `state: EnemyState`, `homeX: number`, `homeY: number` (settable by the caller right after construction), public `readonly type: EnemyType`, public `readonly sprite: Phaser.Physics.Arcade.Sprite`.
  - `enemy.enterAlong(path: Phaser.Curves.Path, durationMs: number, onComplete: () => void): void` — tweens along `path` from `t=0` to `t=1`, sets `state` to `HOLDING` and starts the idle bob on completion, then calls `onComplete`.
  - `enemy.diveAt(targetX: number, targetY: number, durationMs: number, onComplete: () => void): void` — dives toward `(targetX, targetY)` and loops back to `homeX`/`homeY`, ending in `HOLDING` with the bob restarted, then calls `onComplete`.
  - `enemy.destroy(): void` — kills any in-flight tween on the sprite, then destroys the sprite. (`GameScene`'s collision handlers must call this instead of `sprite.destroy()` directly, per Task 4.)
  - Sprite carries `sprite.getData('enemyRef')` → the owning `Enemy` instance (new), alongside the existing `sprite.getData('points')`.

- [ ] **Step 1: Replace `gogologo-src/src/entities/enemy.ts`**

```ts
import Phaser from 'phaser';
import { EnemyType } from '../config/entity-config';

export type EnemyState = 'ENTERING' | 'HOLDING' | 'DIVING' | 'RETURNING';

const BOB_AMPLITUDE = 6; // px, idle sway while HOLDING
const BOB_DURATION_MS = 900;
const RETURN_DURATION_MS = 700;

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly type: EnemyType;
  state: EnemyState = 'ENTERING';
  // Set by the caller (FormationManager) right after construction, before
  // enterAlong() is called -- the slot this enemy holds/returns to.
  homeX = 0;
  homeY = 0;

  private scene: Phaser.Scene;
  private activeTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number, type: EnemyType) {
    this.scene = scene;
    this.type = type;
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    const nativeWidth = this.sprite.width;
    const nativeHeight = this.sprite.height;
    this.sprite.setDisplaySize(type.targetWidth, type.targetWidth * (nativeHeight / nativeWidth));
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.7);
    body.setOffset(this.sprite.width * 0.15, this.sprite.height * 0.15);
    // Movement is driven entirely by tweens on the sprite's x/y (see
    // enterAlong/diveAt below), never by Arcade velocity. Body.preUpdate()
    // re-syncs the body's position from the sprite's transform every physics
    // step regardless of velocity, so overlap detection tracks the tween
    // correctly without any extra wiring.
    body.setVelocity(0, 0);
    // Multiply-tint: recolors the drawing without touching alpha, so the
    // black-to-transparent conversion (see black-to-transparent.ts) still holds.
    this.sprite.setTint(type.tintColor);
    // Phaser's data manager, not a plain property -- GameScene reads this
    // back off the raw sprite in its physics overlap callbacks, which only
    // hand back Phaser.Physics.Arcade.Sprite, not this Enemy wrapper.
    this.sprite.setData('points', type.points);
    this.sprite.setData('enemyRef', this);
  }

  enterAlong(path: Phaser.Curves.Path, durationMs: number, onComplete: () => void): void {
    this.state = 'ENTERING';
    const proxy = { t: 0 };
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = path.getPoint(proxy.t);
        this.sprite.setPosition(p.x, p.y);
      },
      onComplete: () => {
        this.state = 'HOLDING';
        this.startBob();
        onComplete();
      },
    });
  }

  diveAt(targetX: number, targetY: number, durationMs: number, onComplete: () => void): void {
    this.stopActiveTween();
    this.state = 'DIVING';

    const startX = this.sprite.x;
    const startY = this.sprite.y;
    // Loop back up off whichever side of the canvas the enemy is nearer to,
    // then the final short leg (returnToSlot) brings it back onto screen
    // into its slot.
    const exitX = startX < this.scene.scale.width / 2 ? -40 : this.scene.scale.width + 40;
    const nearPlayerY = targetY - 40; // stop just above the player, not on top of it

    const path = new Phaser.Curves.Path(startX, startY);
    path.quadraticBezierTo(targetX, nearPlayerY, (startX + targetX) / 2, (startY + nearPlayerY) / 2);
    path.quadraticBezierTo(exitX, startY, (targetX + exitX) / 2, nearPlayerY);

    const proxy = { t: 0 };
    this.activeTween = this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const p = path.getPoint(proxy.t);
        this.sprite.setPosition(p.x, p.y);
      },
      onComplete: () => this.returnToSlot(onComplete),
    });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  private returnToSlot(onComplete: () => void): void {
    this.state = 'RETURNING';
    this.activeTween = this.scene.tweens.add({
      targets: this.sprite,
      x: this.homeX,
      y: this.homeY,
      duration: RETURN_DURATION_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.state = 'HOLDING';
        this.startBob();
        onComplete();
      },
    });
  }

  private startBob(): void {
    this.activeTween = this.scene.tweens.add({
      targets: this.sprite,
      y: this.homeY - BOB_AMPLITUDE,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopActiveTween(): void {
    if (this.activeTween) {
      this.activeTween.stop();
      this.activeTween = undefined;
    }
  }
}
```

- [ ] **Step 2: Verify state transitions and tween-driven movement**

With `npm run dev` running, navigate to `http://localhost:5173/?cb=en1`. Wait for preload (~1-2s), advance Menu → CharacterSelect → GameScene the same way the character-select plan's verification does (dispatch Space on `MenuScene`, then confirm a pick with Space on `CharacterSelectScene`). Then run:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const EnemyModule = await import('/src/entities/enemy.ts');
  const ConfigModule = await import('/src/config/entity-config.ts');

  const type = ConfigModule.ENEMY_TYPES[1]; // Cóndor
  const textureKey = scene['drawingTextureKeys'][1];
  const enemy = new EnemyModule.Enemy(scene, textureKey, -40, 100, type);
  enemy.homeX = 240;
  enemy.homeY = 100;

  const path = new Phaser.Curves.Path(-40, 100);
  path.lineTo(240, 100);

  const timeline = [];
  const record = (label) => timeline.push({ label, state: enemy.state, x: Math.round(enemy.sprite.x), y: Math.round(enemy.sprite.y) });

  record('before-enter');
  enemy.enterAlong(path, 400, () => record('enter-complete'));

  await new Promise((r) => setTimeout(r, 200));
  record('mid-enter');
  await new Promise((r) => setTimeout(r, 300));
  record('after-enter-settle');

  enemy.diveAt(scene['player'].sprite.x, scene['player'].sprite.y, 500, () => record('dive-cycle-complete'));
  await new Promise((r) => setTimeout(r, 250));
  record('mid-dive');
  await new Promise((r) => setTimeout(r, 1200));
  record('after-dive-and-return');

  enemy.destroy();
  return timeline;
}
```

Expected: `before-enter` has `state: 'ENTERING'`, `x: -40`. `mid-enter` still `'ENTERING'` with `x` somewhere between `-40` and `240` (not at either endpoint). `enter-complete` fires around the 400ms mark with `state: 'HOLDING'`, `x: 240, y: 100`. `mid-dive` has `state: 'DIVING'` with `y` greater than 100 (moved down toward the player). `dive-cycle-complete` and `after-dive-and-return` both show `state: 'HOLDING'`, `x: 240, y` at or within a few px of `100` (the bob tween may have nudged it up to `94`) — confirms the full dive→return→holding cycle lands back at `homeX/homeY`. No thrown errors.

- [ ] **Step 3: Run `npm run build` and confirm the bundle changed**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src" && npm run build
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && git status --porcelain gogologo/
```
Expected: `gogologo/assets/index-*.js` modified.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/entities/enemy.ts gogologo/
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: rewrite Enemy with state machine + tween-based movement

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GE7iPsqxRoQ9YMQ4YGcLHF
```

**Note:** After this task, `GameScene`'s existing `spawnEnemy()` (`game-scene.ts:106-120`) is broken — it calls `enemy.sprite.setVelocityY(enemy.speed)`, and `Enemy` no longer has a `speed` field. This is expected and temporary; Task 4 removes `spawnEnemy()` entirely. If `npm run typecheck` is run between Task 2 and Task 4, it will fail on `game-scene.ts` — that's fine, don't fix it early; Task 4 is next.

---

### Task 3: `FormationManager`

**Files:**
- Create: `gogologo-src/src/systems/formation-manager.ts`

**Interfaces:**
- Consumes: `Enemy`/`EnemyState` from `entities/enemy.ts` (Task 2), `ENEMY_TYPES` from `config/entity-config.ts`, `LevelConfig` from `config/formation-config.ts` (Task 1), `REFERENCE_HEIGHT` from `config/layout-config.ts`.
- Produces (consumed by Task 4's `GameScene`):
  - `class FormationManager` constructor: `(scene: Phaser.Scene, enemyGroup: Phaser.Physics.Arcade.Group, drawingTextureKeys: string[], getPlayerPosition: () => { x: number; y: number }, onWaveClear: () => void)`.
  - `formationManager.startWave(config: LevelConfig): void` — builds and enters a new wave, starts the dive timer.
  - `formationManager.removeEnemy(enemy: Enemy): void` — drops a killed/collided enemy from wave tracking; fires `onWaveClear` when the wave list is empty.
  - `formationManager.destroy(): void` — stops the dive timer (call on game-over).

- [ ] **Step 1: Create `gogologo-src/src/systems/formation-manager.ts`**

```ts
import Phaser from 'phaser';
import { Enemy } from '../entities/enemy';
import { ENEMY_TYPES } from '../config/entity-config';
import { LevelConfig } from '../config/formation-config';
import { REFERENCE_HEIGHT } from '../config/layout-config';

// Row spacing and top margin are tuned against REFERENCE_HEIGHT (see
// layout-config.ts) and scaled by actual canvas height at wave-start time,
// same pattern Enemy previously used for fall speed.
const ROW_SPACING = 70;
const GRID_TOP_MARGIN = 90;
const ENTRANCE_STAGGER_MS = 150;
const ENTRANCE_BASE_DURATION_MS = 900;
const DIVE_BASE_DURATION_MS = 1600;

export class FormationManager {
  private activeEnemies: Enemy[] = [];
  private diveTimer?: Phaser.Time.TimerEvent;

  constructor(
    private scene: Phaser.Scene,
    private enemyGroup: Phaser.Physics.Arcade.Group,
    private drawingTextureKeys: string[],
    private getPlayerPosition: () => { x: number; y: number },
    private onWaveClear: () => void
  ) {}

  startWave(config: LevelConfig): void {
    this.diveTimer?.remove();
    this.activeEnemies = [];

    const scaleFactor = this.scene.scale.height / REFERENCE_HEIGHT;
    const colWidth = this.scene.scale.width / config.cols;
    const rowSpacing = ROW_SPACING * scaleFactor;
    const topMargin = GRID_TOP_MARGIN * scaleFactor;

    let textureIndex = 0;
    let spawnDelay = 0;

    for (let row = 0; row < config.rows; row++) {
      const typeIndex =
        (ENEMY_TYPES.length - 1 - (row % ENEMY_TYPES.length) + ENEMY_TYPES.length) %
        ENEMY_TYPES.length;
      const type = ENEMY_TYPES[typeIndex];
      const homeY = topMargin + row * rowSpacing;

      for (let col = 0; col < config.cols; col++) {
        const homeX = colWidth * col + colWidth / 2;
        const textureKey = this.drawingTextureKeys[textureIndex % this.drawingTextureKeys.length];
        textureIndex++;

        const enterFromLeft = col < config.cols / 2;
        const spawnX = enterFromLeft ? -40 : this.scene.scale.width + 40;
        const spawnY = -40;

        const enemy = new Enemy(this.scene, textureKey, spawnX, spawnY, type);
        enemy.homeX = homeX;
        enemy.homeY = homeY;
        this.enemyGroup.add(enemy.sprite);
        this.activeEnemies.push(enemy);

        const path = new Phaser.Curves.Path(spawnX, spawnY);
        path.quadraticBezierTo(
          homeX,
          homeY,
          enterFromLeft ? homeX - 60 : homeX + 60,
          homeY - 120
        );

        const durationMs = ENTRANCE_BASE_DURATION_MS / type.speedMultiplier;
        this.scene.time.delayedCall(spawnDelay, () => {
          enemy.enterAlong(path, durationMs, () => {});
        });
        spawnDelay += ENTRANCE_STAGGER_MS;
      }
    }

    this.diveTimer = this.scene.time.addEvent({
      delay: config.diveIntervalMs,
      loop: true,
      callback: () => this.triggerDive(),
    });
  }

  removeEnemy(enemy: Enemy): void {
    this.activeEnemies = this.activeEnemies.filter((e) => e !== enemy);
    if (this.activeEnemies.length === 0) {
      this.diveTimer?.remove();
      this.onWaveClear();
    }
  }

  destroy(): void {
    this.diveTimer?.remove();
    this.activeEnemies = [];
  }

  private triggerDive(): void {
    const holding = this.activeEnemies.filter((e) => e.state === 'HOLDING');
    if (holding.length === 0) return;

    const enemy = Phaser.Utils.Array.GetRandom(holding);
    const player = this.getPlayerPosition();
    const durationMs = DIVE_BASE_DURATION_MS / enemy.type.speedMultiplier;
    enemy.diveAt(player.x, player.y, durationMs, () => {});
  }
}
```

- [ ] **Step 2: Verify a full wave in isolation, against the still-live old `GameScene`**

With `npm run dev` running, navigate to `http://localhost:5173/?cb=fm1`, advance Menu → CharacterSelect → GameScene as before. `GameScene`'s own spawn timer is still the old flat-fall version at this point (Task 4 hasn't wired `FormationManager` in yet) — stop it first so it doesn't clutter the test:

```js
() => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  scene['spawnTimer'].remove();
  scene['enemies'].clear(true, true); // remove any already-spawned old-style enemies
  return { cleared: true };
}
```

Then build and run a wave manually:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const FormationModule = await import('/src/systems/formation-manager.ts');
  const ConfigModule = await import('/src/config/formation-config.ts');

  let waveCleared = false;
  const manager = new FormationModule.FormationManager(
    scene,
    scene['enemies'],
    scene['drawingTextureKeys'],
    () => ({ x: scene['player'].sprite.x, y: scene['player'].sprite.y }),
    () => { waveCleared = true; }
  );
  window.__testFormationManager = manager; // keep a handle for the next eval call

  manager.startWave(ConfigModule.levelConfig(1));
  // Worst-case entrance settle for a 3x4 grid is ~2.55s (last enemy starts at
  // 11*150ms stagger, its row's own tween duration on top); level 1's dive
  // timer fires at 3.2s. 2.8s sits inside that window -- fully settled,
  // before any dive has started.
  await new Promise((r) => setTimeout(r, 2800));

  const enemies = scene['enemies'].getChildren();
  return {
    enemyCount: enemies.length, // expect 12 (3 rows x 4 cols at level 1)
    allHolding: enemies.every((e) => e.getData('enemyRef').state === 'HOLDING'),
  };
}
```

Expected: `enemyCount: 12`, `allHolding: true`.

Then verify a dive fires and the wave-clear callback works. Poll rather than sleep-then-snapshot, since the exact moment a dive tick lands relative to when this second tool call happens to start isn't controllable — polling guarantees catching it as long as the poll window exceeds one `diveIntervalMs` (3.2s at level 1):

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const manager = window.__testFormationManager;

  let observedDiving = false;
  const deadline = Date.now() + 4500; // > 3200ms diveIntervalMs, guarantees at least one tick
  while (Date.now() < deadline) {
    const states = scene['enemies'].getChildren().map((e) => e.getData('enemyRef').state);
    if (states.includes('DIVING') || states.includes('RETURNING')) {
      observedDiving = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Kill every enemy directly (bypassing collision) to verify wave-clear.
  scene['enemies'].getChildren().slice().forEach((sprite) => {
    manager.removeEnemy(sprite.getData('enemyRef'));
    sprite.destroy();
  });

  return { observedDiving, remainingCount: scene['enemies'].getChildren().length };
}
```

Expected: `observedDiving: true`, `remainingCount: 0`. `onWaveClear` (which sets `waveCleared = true` in the closure above) fires synchronously the moment `removeEnemy` empties the active list — `remainingCount: 0` plus the `removeEnemy` source (Step 1) already showing that call is sufficient proof; no separate closure inspection needed.

- [ ] **Step 3: Run `npm run build` and confirm the bundle changed**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src" && npm run build
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && git status --porcelain gogologo/
```
Expected: `gogologo/assets/index-*.js` modified.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/systems/formation-manager.ts gogologo/
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add FormationManager for wave grid, entrance, and dive AI

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GE7iPsqxRoQ9YMQ4YGcLHF
```

---

### Task 4: Wire `FormationManager` into `GameScene`, remove old spawn loop and bottom-edge check

**Files:**
- Modify: `gogologo-src/src/scenes/game-scene.ts` (rewrite the enemy-spawn portions; collision handlers route through `Enemy.destroy()` + `FormationManager.removeEnemy()`; remove the bottom-edge check; add `level` state)

**Interfaces:**
- Consumes: `FormationManager` (Task 3), `levelConfig` (Task 1), `Enemy` (Task 2, for the `enemyRef` cast in collision handlers).
- Produces: nothing new downstream — this is the final integration point for this plan.

- [ ] **Step 1: Replace `gogologo-src/src/scenes/game-scene.ts`**

```ts
import Phaser from 'phaser';
import { createInputController, InputController, CONTROL_ZONE_HEIGHT } from '../systems/input-system';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { FormationManager } from '../systems/formation-manager';
import { levelConfig } from '../config/formation-config';
import { setBestScoreIfHigher } from '../systems/save-manager';
import { HUD_TEXT_COLOR } from '../config/visual-config';

const STARTING_LIVES = 3;
// Keeps the player clear of the touch control strip (CONTROL_ZONE_HEIGHT)
// reserved at the bottom of the canvas, so the ship sits visibly above the
// tap area instead of overlapping it. Desktop (no touch, no control strip)
// only needs the plain bottom margin -- see playerY() below.
const PLAYER_BOTTOM_MARGIN = 60;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drawingTextureKeys!: string[];
  private formationManager!: FormationManager;
  private level = 1;
  private score = 0;
  private lives = STARTING_LIVES;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 10);
    graphics.generateTexture('projectile', 4, 10);
    graphics.destroy();

    this.drawingTextureKeys = this.registry.get('drawingTextureKeys') as string[];
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.level = 1;

    this.player = new Player(this, this.drawingTextureKeys[0], this.scale.width / 2, this.playerY());
    this.inputController = createInputController(this);

    this.enemies = this.physics.add.group();
    this.formationManager = new FormationManager(
      this,
      this.enemies,
      this.drawingTextureKeys,
      () => ({ x: this.player.sprite.x, y: this.player.sprite.y }),
      () => this.handleWaveClear()
    );
    this.formationManager.startWave(levelConfig(this.level));

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', color: HUD_TEXT_COLOR });
    this.livesText = this.add.text(10, 30, `Lives: ${this.lives}`, {
      fontSize: '16px',
      color: HUD_TEXT_COLOR,
    });

    this.physics.add.overlap(this.player.getProjectiles(), this.enemies, (projectile, enemy) =>
      this.handleProjectileHitsEnemy(
        projectile as Phaser.Physics.Arcade.Sprite,
        enemy as Phaser.Physics.Arcade.Sprite
      )
    );

    this.physics.add.overlap(this.player.sprite, this.enemies, (_player, enemy) =>
      this.handleEnemyHitsPlayer(enemy as Phaser.Physics.Arcade.Sprite)
    );
  }

  update(): void {
    this.player.moveToX(this.inputController.getTargetX(this.player.sprite.x));
    if (this.inputController.isFiring()) {
      this.player.fire();
    }

    this.player.getProjectiles().getChildren().slice().forEach((child) => {
      const projectile = child as Phaser.Physics.Arcade.Sprite;
      if (projectile.y < -20) {
        projectile.destroy();
      }
    });
  }

  private playerY(): number {
    // Touch devices reserve a control strip at the bottom for the fire
    // button (see input-system.ts) -- the player must sit above it.
    // Desktop has no touch controls at all, so no strip to clear.
    const isTouchCapable = 'ontouchstart' in window;
    const reservedHeight = isTouchCapable ? CONTROL_ZONE_HEIGHT : 0;
    return this.scale.height - reservedHeight - PLAYER_BOTTOM_MARGIN;
  }

  private handleWaveClear(): void {
    this.level++;
    this.formationManager.startWave(levelConfig(this.level));
  }

  private handleProjectileHitsEnemy(
    projectile: Phaser.Physics.Arcade.Sprite,
    enemySprite: Phaser.Physics.Arcade.Sprite
  ): void {
    projectile.destroy();
    const points = (enemySprite.getData('points') as number | undefined) ?? 0;
    const enemyRef = enemySprite.getData('enemyRef') as Enemy;
    enemyRef.destroy();
    this.formationManager.removeEnemy(enemyRef);
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private handleEnemyHitsPlayer(enemySprite: Phaser.Physics.Arcade.Sprite): void {
    const enemyRef = enemySprite.getData('enemyRef') as Enemy;
    enemyRef.destroy();
    this.formationManager.removeEnemy(enemyRef);
    this.loseLife();
  }

  private loseLife(): void {
    if (this.lives <= 0) return;
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) {
      this.formationManager.destroy();
      setBestScoreIfHigher(this.score);
      this.scene.start('GameOverScene', { score: this.score });
    }
  }
}
```

Note what's gone versus the pre-Task-4 file: `ENEMY_SPAWN_INTERVAL_MS`, `spawnTimer`, `nextEnemyTextureIndex`, `nextEnemyTypeIndex`, `spawnEnemy()`, the `ENEMY_TYPES` import (now only used inside `formation-manager.ts`), and the `update()` loop's bottom-edge-loses-a-life block.

- [ ] **Step 2: `npm run typecheck` passes**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src" && npm run typecheck
```
Expected: no errors. (This is the point where Task 2's temporary `spawnEnemy()` breakage, noted at the end of Task 2, is resolved — `spawnEnemy()` no longer exists.)

- [ ] **Step 3: Verify full wave lifecycle in the real game (mobile layout)**

Navigate to `http://localhost:5173/?cb=gs1`, advance Menu → CharacterSelect → GameScene as before. Confirm the wave forms and levels advance:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  // See Task 3 Step 2 for why 2.8s: past worst-case entrance settle (~2.55s),
  // before level 1's dive timer fires (3.2s).
  await new Promise((r) => setTimeout(r, 2800));
  const enemies = scene['enemies'].getChildren();
  return {
    level: scene['level'],
    enemyCount: enemies.length, // expect 12 at level 1
    allHolding: enemies.every((e) => e.getData('enemyRef').state === 'HOLDING'),
  };
}
```
Expected: `level: 1`, `enemyCount: 12`, `allHolding: true`.

Force a wave clear by killing every enemy through the real collision path's equivalent (calling the scene's private handler isn't accessible from outside, so simulate the same effect `handleProjectileHitsEnemy`/`handleEnemyHitsPlayer` would produce — destroy each enemy and remove it from the formation manager, mirroring exactly what those handlers do):

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const before = scene['level'];

  scene['enemies'].getChildren().slice().forEach((sprite) => {
    const enemyRef = sprite.getData('enemyRef');
    enemyRef.destroy();
    scene['formationManager'].removeEnemy(enemyRef);
  });

  await new Promise((r) => setTimeout(r, 500));
  const enemies = scene['enemies'].getChildren();
  return {
    levelBefore: before,
    levelAfter: scene['level'], // expect before + 1
    newWaveEnemyCount: enemies.length, // expect 12 again (level 2 is still rows:3 per formula)
  };
}
```
Expected: `levelAfter` is `levelBefore + 1`, `newWaveEnemyCount: 12` (level 2's `rows` is still 3 per `levelConfig`, same grid size, but `diveIntervalMs` is shorter — confirms escalation without needing to wait through another full level).

- [ ] **Step 4: Verify scoring, lives, and the removed bottom-edge check**

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const scoreBefore = scene['score'];
  const enemySprite = scene['enemies'].getChildren()[0];
  const points = enemySprite.getData('points');

  // Simulate a projectile hit directly via the same overlap the game wires up.
  const projectile = scene['player'].getProjectiles().create(enemySprite.x, enemySprite.y, 'projectile');
  scene['handleProjectileHitsEnemy'](projectile, enemySprite);

  return {
    scoreIncreased: scene['score'] === scoreBefore + points,
    enemyRemoved: !scene['enemies'].getChildren().includes(enemySprite),
  };
}
```
Expected: `scoreIncreased: true`, `enemyRemoved: true`.

Confirm the bottom-edge check is really gone (an enemy sitting well past the bottom edge for several frames should NOT cost a life, since formation enemies never do that under normal play but this proves the removed code path):

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const livesBefore = scene['lives'];
  const enemySprite = scene['enemies'].getChildren()[0];
  enemySprite.y = scene.scale.height + 100; // manually place past the old threshold
  await new Promise((r) => setTimeout(r, 500)); // several update() frames
  return { livesUnchanged: scene['lives'] === livesBefore };
}
```
Expected: `livesUnchanged: true`.

- [ ] **Step 5: Verify on desktop layout**

Per this project's testing convention, `game-config.ts`'s device check runs at module-load time, so forcing non-touch requires `page.addInitScript()` before navigation rather than `page.evaluate()` after. Set that up, navigate to `http://localhost:5173/?cb=gs2`, advance the same Menu → CharacterSelect → GameScene flow (desktop has no touch controls, so use keyboard/Space throughout), then re-run Step 3's first check:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  await new Promise((r) => setTimeout(r, 2800)); // settled, before level 1's 3.2s dive timer
  const enemies = scene['enemies'].getChildren();
  const maxY = Math.max(...enemies.map((e) => e.y));
  return {
    canvasHeight: scene.scale.height, // expect 640
    enemyCount: enemies.length, // expect 12
    gridFitsOnScreen: maxY < scene.scale.height - 100, // formation shouldn't crowd the player's zone
  };
}
```
Expected: `canvasHeight: 640`, `enemyCount: 12`, `gridFitsOnScreen: true` — confirms `ROW_SPACING`/`GRID_TOP_MARGIN`'s height scaling keeps the grid clear of the player on the shorter desktop canvas.

- [ ] **Step 6: Run `npm run build` and confirm the bundle changed**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src" && npm run build
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && git status --porcelain gogologo/
```
Expected: `gogologo/assets/index-*.js` modified.

- [ ] **Step 7: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/scenes/game-scene.ts gogologo/
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: wire FormationManager into GameScene, drop flat spawn loop

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GE7iPsqxRoQ9YMQ4YGcLHF
```

**This task completes the plan.** Sub-project 3 is now integrated: `main` still runs the old behavior until this branch is shipped via the project's standard `git checkout main && git merge --ff-only pv1 && git push origin main` step — do that only when the user explicitly asks to ship.
