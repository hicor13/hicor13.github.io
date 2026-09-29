# Gogologo Character Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `CharacterSelectScene` shows a 4×3 grid of the pooled Garabatos drawings between `MenuScene` and `GameScene`; the player moves a highlight (keyboard or touch) and confirms a pick, which reorders the registry's drawing arrays so the pick lands at index 0 — `GameScene` needs zero code changes, since it already reads index 0 as "the player's ship."

**Architecture:** One new file, `gogologo-src/src/scenes/character-select-scene.ts`, registered in `game-config.ts` between `MenuScene` and `GameScene`. `MenuScene`'s start handler changes to target the new scene instead of `GameScene` directly. All new state (highlight index, drawing pool) lives inside the new scene; it reads `drawings: {key,name}[]` from the registry (already populated by `PreloadScene`) and, on confirm, writes back a reordered `drawings` + derived `drawingTextureKeys` before starting `GameScene`.

**Tech Stack:** Phaser 3, TypeScript — same as the rest of `gogologo-src/`. No test framework (repo convention); verification is manual via `npm run dev` + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-gogologo-character-select-design.md`

## Global Constraints

- Work happens on branch `pv1` in the deploy repo: `/Users/hicor13/Website/hicor13.github.io/hicor13.github.io`.
- Do not modify `GameScene`, `PreloadScene`, `Player`, `Enemy`, or `input-system.ts` — the spec requires zero changes to any of them.
- No back-to-menu control on the select screen (matches this game's existing no-back-navigation pattern).
- Restart (`GameOverScene` → `GameScene`) is already direct and unchanged — the registry's reordered arrays persist for the whole session, so a restarted `GameScene` reuses the same pick without revisiting `CharacterSelectScene`.
- Current canvas size is `480×1040` (`gogologo-src/src/config/game-config.ts`) — already updated by an earlier mobile-scaling fix; use these dimensions for layout math, not the original `480×720`.
- Never `git commit` or `git push` without explicit user authorization for that specific commit — stage the files then confirm before running `git commit`.
- This repo has repeatedly hit stale-cache false positives when re-navigating to an already-visited URL in the same browser session — always append a fresh cache-busting query string on re-navigation.

---

### Task 1: CharacterSelectScene grid + keyboard navigation + confirm/reorder

**Files:**
- Create: `gogologo-src/src/scenes/character-select-scene.ts`
- Modify: `gogologo-src/src/scenes/menu-scene.ts` (change the start target)
- Modify: `gogologo-src/src/config/game-config.ts` (register the new scene)

**Interfaces:**
- Consumes: registry key `drawings: {key: string; name: string}[]` (already set by `PreloadScene`, see `gogologo-src/src/scenes/preload-scene.ts:51-52`).
- Produces: on confirm, overwrites registry keys `drawings` (reordered, picked entry at index 0) and `drawingTextureKeys` (`string[]`, derived from the reordered `drawings`) — both read downstream by `GameScene` exactly as `PreloadScene` originally set them, so `GameScene` requires no changes. Also produces the scene key `'CharacterSelectScene'` — the next task adds touch support to the same scene file, no new interface.

- [ ] **Step 1: Create `gogologo-src/src/scenes/character-select-scene.ts`**

```ts
import Phaser from 'phaser';

interface DrawingEntry {
  key: string;
  name: string;
}

const GRID_COLS = 4;
const CELL_WIDTH = 100;
const CELL_HEIGHT = 120;
const CELL_GAP_X = 10;
const CELL_GAP_Y = 20;
const GRID_MARGIN_X = 25;
const GRID_START_Y = 280;
const PORTRAIT_BOX = 80;
const HIGHLIGHT_COLOR = 0xd91023;

export class CharacterSelectScene extends Phaser.Scene {
  private drawings: DrawingEntry[] = [];
  private highlightedIndex = 0;
  private highlightGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.drawings = this.registry.get('drawings') as DrawingEntry[];
    this.highlightedIndex = 0;

    this.add
      .text(this.scale.width / 2, 200, 'CHOOSE YOUR SHIP', { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 720, 'Arrows / Tap: choose', { fontSize: '14px', color: '#cccccc' })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, 745, 'Space / Tap again: confirm', {
        fontSize: '14px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    this.drawings.forEach((entry, index) => {
      const { x, y } = this.cellTopLeft(index);
      const portraitCx = x + CELL_WIDTH / 2;
      const portraitCy = y + PORTRAIT_BOX / 2;

      const image = this.add.image(portraitCx, portraitCy, entry.key);
      const nativeWidth = image.width;
      const nativeHeight = image.height;
      const scale = Math.min(PORTRAIT_BOX / nativeWidth, PORTRAIT_BOX / nativeHeight);
      image.setDisplaySize(nativeWidth * scale, nativeHeight * scale);

      this.add
        .text(portraitCx, y + PORTRAIT_BOX + 8, entry.name, { fontSize: '12px', color: '#ffffff' })
        .setOrigin(0.5, 0);
    });

    this.highlightGraphics = this.add.graphics();
    this.drawHighlight();

    const cursors = this.input.keyboard!.createCursorKeys();
    const keySpace = this.input.keyboard!.addKey('SPACE');
    const keyEnter = this.input.keyboard!.addKey('ENTER');

    cursors.left.on('down', () => this.moveHighlight('left'));
    cursors.right.on('down', () => this.moveHighlight('right'));
    cursors.up.on('down', () => this.moveHighlight('up'));
    cursors.down.on('down', () => this.moveHighlight('down'));
    keySpace.on('down', () => this.confirmSelection(this.highlightedIndex));
    keyEnter.on('down', () => this.confirmSelection(this.highlightedIndex));
  }

  private cellTopLeft(index: number): { x: number; y: number } {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    return {
      x: GRID_MARGIN_X + col * (CELL_WIDTH + CELL_GAP_X),
      y: GRID_START_Y + row * (CELL_HEIGHT + CELL_GAP_Y),
    };
  }

  private moveHighlight(direction: 'left' | 'right' | 'up' | 'down'): void {
    const count = this.drawings.length;
    const numRows = Math.ceil(count / GRID_COLS);
    const col = this.highlightedIndex % GRID_COLS;
    const row = Math.floor(this.highlightedIndex / GRID_COLS);

    let newIndex = this.highlightedIndex;

    if (direction === 'right') {
      const newCol = (col + 1) % GRID_COLS;
      newIndex = row * GRID_COLS + newCol;
      if (newIndex >= count) newIndex = row * GRID_COLS;
    } else if (direction === 'left') {
      const newCol = (col - 1 + GRID_COLS) % GRID_COLS;
      newIndex = row * GRID_COLS + newCol;
      if (newIndex >= count) {
        const lastColInRow = Math.min(GRID_COLS - 1, count - 1 - row * GRID_COLS);
        newIndex = row * GRID_COLS + lastColInRow;
      }
    } else if (direction === 'down') {
      const newRow = (row + 1) % numRows;
      newIndex = newRow * GRID_COLS + col;
      if (newIndex >= count) newIndex = count - 1;
    } else if (direction === 'up') {
      const newRow = (row - 1 + numRows) % numRows;
      newIndex = newRow * GRID_COLS + col;
      if (newIndex >= count) newIndex = count - 1;
    }

    this.highlightedIndex = newIndex;
    this.drawHighlight();
  }

  private drawHighlight(): void {
    const { x, y } = this.cellTopLeft(this.highlightedIndex);
    this.highlightGraphics.clear();
    this.highlightGraphics.lineStyle(4, HIGHLIGHT_COLOR, 1);
    this.highlightGraphics.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
  }

  private confirmSelection(index: number): void {
    const picked = this.drawings[index];
    const reordered = [picked, ...this.drawings.filter((_, i) => i !== index)];
    this.registry.set('drawings', reordered);
    this.registry.set(
      'drawingTextureKeys',
      reordered.map((d) => d.key)
    );
    this.scene.start('GameScene');
  }
}
```

`GRID_START_Y = 280` and the two hint-text `y` values (`720`, `745`) are chosen against the current `480×1040` canvas so the grid (3 rows max, `280` to `680`) and hint text sit roughly centered with balanced empty space above the title and below the hints — not pixel-exact, just visually reasonable; no further tuning needed unless Step 4's manual check looks obviously wrong.

- [ ] **Step 2: Modify `gogologo-src/src/scenes/menu-scene.ts`** — change the start target

Change:
```ts
    const start = (): void => {
      this.scene.start('GameScene');
    };
```
to:
```ts
    const start = (): void => {
      this.scene.start('CharacterSelectScene');
    };
```

- [ ] **Step 3: Modify `gogologo-src/src/config/game-config.ts`** — register the new scene between `MenuScene` and `GameScene`

Add the import alongside the other scene imports:
```ts
import { CharacterSelectScene } from '../scenes/character-select-scene';
```

Change the `scene` array:
```ts
  scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, GameScene, GameOverScene],
```

- [ ] **Step 4: Verify grid rendering, keyboard navigation, and confirm/reorder**

With `npm run dev` running in `gogologo-src/`, navigate to `http://localhost:5173/?cb=cs1`. Wait for preload to finish (real network call, ~1-2s), then `browser_evaluate`:

```js
() => {
  const game = window.__gogologoGame;
  return { activeScene: game.scene.getScenes(true)[0]?.scene.key };
}
```

Expected: `activeScene: 'MenuScene'`. Press Space to advance (or dispatch a `KeyboardEvent('keydown', {code:'Space'})` on `document`), then re-check `activeScene` — expected `'CharacterSelectScene'`.

Then check the grid rendered the full pool:

```js
() => {
  const scene = window.__gogologoGame.scene.getScene('CharacterSelectScene');
  return { drawingCount: scene['drawings'].length, highlightedIndex: scene['highlightedIndex'] };
}
```

Expected: `drawingCount` between 1 and 12 (whatever `PreloadScene` actually loaded — 12 in the normal case), `highlightedIndex: 0`.

Verify keyboard navigation and wraparound (assumes the normal 12-drawing case — 4 cols × 3 rows):

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('CharacterSelectScene');
  const results = {};

  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
  await new Promise((r) => setTimeout(r, 50));
  results.afterLeftFromZero = scene['highlightedIndex']; // expect 3 (wraps to last col of row 0)

  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
  await new Promise((r) => setTimeout(r, 50));
  results.afterRightFromThree = scene['highlightedIndex']; // expect 0 (wraps back)

  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
  await new Promise((r) => setTimeout(r, 50));
  results.afterUpFromZero = scene['highlightedIndex']; // expect 8 (wraps to last row, same col)

  return results;
}
```

Expected (12-drawing case): `{ afterLeftFromZero: 3, afterRightFromThree: 0, afterUpFromZero: 8 }`. If the pool has fewer than 12 drawings (placeholder-fallback case), skip this exact check — instead confirm `highlightedIndex` never goes negative or out of bounds after a few arrow presses in each direction.

Verify confirm + reorder:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('CharacterSelectScene');
  const drawingsBefore = scene['drawings'];
  const pickedIndex = 2;
  const pickedKey = drawingsBefore[pickedIndex]?.key ?? drawingsBefore[0].key;

  // Move highlight to a known index deterministically rather than relying on
  // prior test state, then confirm.
  scene['highlightedIndex'] = Math.min(pickedIndex, drawingsBefore.length - 1);
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  await new Promise((r) => setTimeout(r, 100));

  const game = window.__gogologoGame;
  const gameScene = game.scene.getScene('GameScene');
  return {
    activeScene: game.scene.getScenes(true)[0]?.scene.key,
    registryKeys: game.registry.get('drawingTextureKeys'),
    firstKeyMatchesPick: game.registry.get('drawingTextureKeys')[0] === pickedKey,
  };
}
```

Expected: `activeScene: 'GameScene'`, `firstKeyMatchesPick: true`.

- [ ] **Step 5: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/scenes/character-select-scene.ts gogologo-src/src/scenes/menu-scene.ts gogologo-src/src/config/game-config.ts
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add character-select scene with grid + keyboard navigation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 2: Touch navigation for character select

**Files:**
- Modify: `gogologo-src/src/scenes/character-select-scene.ts` (add touch handling inside `create()`)

**Interfaces:**
- Consumes: nothing new — same scene, same `cellTopLeft`/`moveHighlight`/`confirmSelection` from Task 1.
- Produces: nothing new downstream.

- [ ] **Step 1: Add touch handling to `create()` in `gogologo-src/src/scenes/character-select-scene.ts`**

Add this block at the end of `create()`, after the `keyEnter.on(...)` line from Task 1:

```ts
    const isTouchCapable = 'ontouchstart' in window;
    if (isTouchCapable) {
      this.drawings.forEach((_, index) => {
        const { x, y } = this.cellTopLeft(index);
        const zone = this.add.zone(x, y, CELL_WIDTH, CELL_HEIGHT).setOrigin(0, 0).setInteractive();
        zone.on('pointerdown', () => {
          if (index === this.highlightedIndex) {
            this.confirmSelection(index);
          } else {
            this.highlightedIndex = index;
            this.drawHighlight();
          }
        });
      });
    }
```

This mirrors `input-system.ts`'s existing `'ontouchstart' in window` detection convention (not user-agent sniffing).

- [ ] **Step 2: Verify touch navigation**

The verification browser doesn't naturally report `'ontouchstart' in window` as `true`. Force it, same technique this codebase already uses (see the original core-engine plan's Task 6):

```js
() => { window.ontouchstart = null; }
```

Then re-navigate to `http://localhost:5173/?cb=cs2` (a fresh load re-runs the `'ontouchstart' in window` check inside `create()` — re-run the `window.ontouchstart = null` evaluate again immediately after this navigation, before advancing scenes, since a full page reload resets `window`). Advance Menu → CharacterSelectScene the same way as Task 1 Step 4.

Verify tap-to-highlight, tap-again-to-confirm:

```js
async () => {
  const game = window.__gogologoGame;
  const scene = game.scene.getScene('CharacterSelectScene');
  const canvas = document.querySelector('#game-container canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / game.scale.width;
  const scaleY = rect.height / game.scale.height;

  // Tap cell index 1 (not currently highlighted — index 0 is highlighted by default).
  const cell = scene['cellTopLeft'](1);
  const tapX = rect.left + (cell.x + 50) * scaleX; // +50: cell center x offset (CELL_WIDTH/2)
  const tapY = rect.top + (cell.y + 60) * scaleY; // +60: cell center y offset (CELL_HEIGHT/2)

  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: tapX, clientY: tapY, pointerId: 1, isPrimary: true, bubbles: true,
  }));
  await new Promise((r) => setTimeout(r, 50));

  const afterFirstTap = scene['highlightedIndex']; // expect 1 (moved highlight, not confirmed)

  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: tapX, clientY: tapY, pointerId: 1, isPrimary: true, bubbles: true,
  }));
  await new Promise((r) => setTimeout(r, 100));

  const activeScene = game.scene.getScenes(true)[0]?.scene.key; // expect 'GameScene' (second tap confirmed)
  return { afterFirstTap, activeScene };
}
```

Expected: `{ afterFirstTap: 1, activeScene: 'GameScene' }`. If the tap coordinates land on the wrong cell (miscalculated screen position), `afterFirstTap` will be some other index or unchanged — recompute the cell's screen position from `canvas.getBoundingClientRect()` and retry rather than assuming a silent pass.

- [ ] **Step 3: Full end-to-end pass — restart skips character select**

Continue from the `GameScene` reached in Step 2 (or re-navigate and replay Task 1 Step 4's confirm flow if starting fresh). Force a game-over the same way the original core-engine plan's Task 7 verification did (set `lives` to 1, spawn an enemy on top of the player), then dispatch Space to restart, and confirm the scene that comes back is `GameScene` directly — not `CharacterSelectScene`:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  scene['lives'] = 1;
  scene['livesText'].setText('Lives: 1');
  const EnemyModule = await import('/src/entities/enemy.ts');
  const enemy = new EnemyModule.Enemy(
    scene,
    scene['drawingTextureKeys'][0],
    scene['player'].sprite.x,
    scene['player'].sprite.y,
    0xd91023
  );
  scene['enemies'].add(enemy.sprite);
  await new Promise((r) => setTimeout(r, 200));
  return { activeScene: window.__gogologoGame.scene.getScenes(true)[0]?.scene.key };
}
```

Expected: `activeScene: 'GameOverScene'`. Then dispatch Space again (after the 600ms input-delay `GameOverScene` already has — wait at least 700ms first) and confirm:

```js
async () => {
  await new Promise((r) => setTimeout(r, 700));
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  await new Promise((r) => setTimeout(r, 100));
  return { activeScene: window.__gogologoGame.scene.getScenes(true)[0]?.scene.key };
}
```

Expected: `activeScene: 'GameScene'` (not `'CharacterSelectScene'`) — confirms restart skips re-selection, per the spec.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/scenes/character-select-scene.ts
git status --porcelain
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add touch navigation to character select

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

**This task completes the plan.**
