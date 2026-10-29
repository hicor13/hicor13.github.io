# Gogologo Core Engine & Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable arcade-shooter vertical slice at `/gogologo/`: player ship moves and shoots, simple enemies descend, collisions score/cost lives, game-over/restart works, keyboard and touch controls both work, and both the player ship and enemy sprites are real Garabatos drawings with black pixels converted to transparent.

**Architecture:** A new Phaser 3 + TypeScript + Vite project lives in `gogologo-src/` (dev-only source, not served — `node_modules/` gitignored). Vite's `build.outDir` writes straight into the sibling `gogologo/` directory, which is the actual path served at `mariocornejo.com/gogologo/` as plain static files, matching every other page on this site. A pure `black-to-transparent.ts` function handles the pixel conversion; `garabatos-sprites.ts` wraps it with the Supabase fetch and Phaser texture registration; five scenes (Boot → Preload → Menu → Game → GameOver) drive the flow; one `input-system.ts` module unifies keyboard and touch into the same `getTargetX()`/`isFiring()` interface so gameplay code never branches on input source.

**Tech Stack:** Phaser 3, TypeScript 5, Vite 5, `@supabase/supabase-js` (npm, not a CDN script tag — this is the one part of the site with a real build step). No test framework — this repo has none, and a first playable prototype doesn't yet warrant adding one; verification is manual via `npm run dev` + Playwright, per this repo's established convention.

**Spec:** `docs/superpowers/specs/2026-09-10-gogologo-core-engine-design.md`

## Global Constraints

- `gogologo-src/` is dev-only source — never served, `node_modules/` and OS junk files gitignored inside it.
- Vite config: `base: '/gogologo/'`, `build.outDir: '../gogologo'`, `build.emptyOutDir: true` (Vite refuses to empty a directory outside the project root without this flag).
- Supabase project URL: `https://hvysswkivofvscfqysnj.supabase.co`. Anon key (public, already used client-side everywhere else in this repo): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70`.
- Blank/unscratched canvas color (from `garabatos/canvas.js`): `#111111` — the color `black-to-transparent.ts` treats as transparent.
- No formations, no attack AI, no discrete levels, no tractor-beam capture, no character-select UI, no gameplay effect tied to scratch-density — all explicitly out of scope for this plan (later sub-projects).
- Never `git commit` or `git push` without explicit user authorization for that specific commit — when a step says "stage and confirm before committing," stage the files then confirm before running `git commit`.
- Work happens on branch `pv1` in the deploy repo: `/Users/hicor13/Website/hicor13.github.io/hicor13.github.io`.
- This repo has repeatedly hit stale-cache false positives when re-navigating to an already-visited URL in the same browser session — always append a fresh cache-busting query string on re-navigation.

---

### Task 1: Scaffold the Phaser/Vite project

**Files:**
- Create: `gogologo-src/package.json`
- Create: `gogologo-src/tsconfig.json`
- Create: `gogologo-src/vite.config.ts`
- Create: `gogologo-src/.gitignore`
- Create: `gogologo-src/index.html`
- Create: `gogologo-src/src/main.ts`
- Create: `gogologo-src/src/config/game-config.ts`

**Interfaces:**
- Produces: `GAME_CONFIG` (a `Phaser.Types.Core.GameConfig`, exported from `game-config.ts`, `scene: []` for now — later tasks append to this array). `window.__gogologoGame` (the live `Phaser.Game` instance, exposed for Playwright-driven verification in every later task — harmless in a public arcade game with no sensitive state).

This task has no earlier tasks to consume from.

- [ ] **Step 1: Create `gogologo-src/package.json`**

```json
{
  "name": "gogologo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.86.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `gogologo-src/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `gogologo-src/vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gogologo/',
  build: {
    outDir: '../gogologo',
    emptyOutDir: true,
  },
});
```

`outDir` resolves outside the project root (`gogologo-src/`) — Vite requires `emptyOutDir: true` explicitly in this case, or it refuses to empty the directory as a safety measure.

- [ ] **Step 4: Create `gogologo-src/.gitignore`**

```
node_modules/
.DS_Store
```

- [ ] **Step 5: Create `gogologo-src/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Gogologo</title>
  <style>
    html, body { margin: 0; padding: 0; background: #111; overflow: hidden; }
    #game-container { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create `gogologo-src/src/config/game-config.ts`**

```ts
import Phaser from 'phaser';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 720,
  backgroundColor: '#111111',
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
  scene: [],
};
```

- [ ] **Step 7: Create `gogologo-src/src/main.ts`**

```ts
import Phaser from 'phaser';
import { GAME_CONFIG } from './config/game-config';

const game = new Phaser.Game(GAME_CONFIG);

// Exposed for Playwright-driven verification throughout this plan's tasks.
// Harmless — this is a public arcade game with no sensitive state.
(window as unknown as { __gogologoGame: Phaser.Game }).__gogologoGame = game;
```

- [ ] **Step 8: Install and verify the dev server boots**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
npm install
git status --porcelain ..   # confirm node_modules/ does NOT appear — .gitignore working
npm run dev
```

Vite prints a local URL, typically `http://localhost:5173`. Use `mcp__plugin_playwright_playwright__browser_navigate` to open it, then `browser_evaluate` with `() => !!window.__gogologoGame && document.querySelector('#game-container canvas') !== null` — expect `true`. Check `browser_console_messages` — expect no errors (a warning about an empty scene list, if any, is fine).

- [ ] **Step 9: Verify the production build**

Stop the dev server (Ctrl+C or just proceed — `npm run build` doesn't need it stopped), then:

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
npm run build
ls -la "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo"
```

Expected: an `index.html` and an `assets/` directory with hashed `.js`/`.css` files now exist at the deploy path `gogologo/` (sibling of `gogologo-src/`).

- [ ] **Step 10: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/package.json gogologo-src/package-lock.json gogologo-src/tsconfig.json gogologo-src/vite.config.ts gogologo-src/.gitignore gogologo-src/index.html gogologo-src/src/main.ts gogologo-src/src/config/game-config.ts gogologo/
git status --porcelain   # confirm no node_modules/ paths appear in the staged list
```

Confirm with the user before `git commit`. Suggested message:

```
feat: scaffold gogologo Phaser/Vite project (empty scene, boots + builds)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 2: Black-to-transparent pixel conversion

**Files:**
- Create: `gogologo-src/src/utils/black-to-transparent.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `applyBlackTransparency(image: HTMLImageElement, threshold?: number): HTMLCanvasElement` — pure function, no Phaser dependency. `threshold` defaults to `40`.

- [ ] **Step 1: Create `gogologo-src/src/utils/black-to-transparent.ts`**

```ts
// Converts near-black pixels (matching the blank-canvas fill color used
// throughout the Garabatos family, #111111 — see garabatos/canvas.js and
// gallery/garabatos/mosaic-engine.js elsewhere in this repo) to fully
// transparent, so a drawing exported from the scratch board reads as a
// sprite silhouette instead of a black box. Pure canvas function, no
// Phaser dependency — testable with any loaded image.
const BLANK_R = 0x11;
const BLANK_G = 0x11;
const BLANK_B = 0x11;

export function applyBlackTransparency(
  image: HTMLImageElement,
  threshold: number = 40
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('applyBlackTransparency: 2D context unavailable');

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = pixels[i] - BLANK_R;
    const dg = pixels[i + 1] - BLANK_G;
    const db = pixels[i + 2] - BLANK_B;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < threshold) {
      pixels[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
```

- [ ] **Step 2: Write a temporary verification harness (not committed)**

Create `gogologo-src/_check.html` — placed in the project root so Vite's dev server serves it alongside `index.html`, and so the bare TS import resolves the same way it does for the real app. Deleted in Step 4, before anything is staged:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>check</title></head>
<body>
<script type="module">
  import { applyBlackTransparency } from '/src/utils/black-to-transparent.ts';
  window.checkResults = {};

  async function run() {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, 5, 10);

    const img = new Image();
    const ready = new Promise((res) => { img.onload = res; });
    img.src = canvas.toDataURL();
    await ready;

    const result = applyBlackTransparency(img, 40);
    const rctx = result.getContext('2d');
    const blackPixel = rctx.getImageData(8, 5, 1, 1).data;
    const coloredPixel = rctx.getImageData(2, 5, 1, 1).data;

    window.checkResults = {
      blackPixelAlpha: blackPixel[3],
      coloredPixelAlpha: coloredPixel[3],
      coloredPixelRGB: [coloredPixel[0], coloredPixel[1], coloredPixel[2]],
    };
  }

  run();
</script>
</body>
</html>
```

- [ ] **Step 3: Run it and verify**

With `npm run dev` running, navigate to `http://localhost:5173/_check.html?cb=1`, then `browser_evaluate` with `() => window.checkResults`.

Expected: `{ blackPixelAlpha: 0, coloredPixelAlpha: 255, coloredPixelRGB: [255, 0, 255] }`. The left half (magenta, `#ff00ff`) stays fully opaque; the right half (`#111111`, distance 0 from blank) becomes fully transparent.

- [ ] **Step 4: Delete the scratch harness and stage the real file**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
rm _check.html
git status --porcelain .   # confirm _check.html is gone, black-to-transparent.ts is untracked
git add src/utils/black-to-transparent.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add black-to-transparent pixel conversion for Garabatos drawings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 3: Garabatos drawing fetch + texture registration

**Files:**
- Modify: `gogologo-src/package.json` (add `@supabase/supabase-js` dependency)
- Create: `gogologo-src/src/systems/garabatos-sprites.ts`

**Interfaces:**
- Consumes: `applyBlackTransparency` (Task 2).
- Produces: `DrawingRef` (`{ name: string; storagePath: string; url: string }`), `fetchDrawingPool(count: number): Promise<DrawingRef[]>`, `loadTransparentTexture(scene: Phaser.Scene, key: string, url: string): Promise<boolean>`.

- [ ] **Step 1: Add the Supabase dependency**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
npm install @supabase/supabase-js@^2.45.0
```

- [ ] **Step 2: Create `gogologo-src/src/systems/garabatos-sprites.ts`**

```ts
// Fetches drawings from the same Supabase table every other Garabatos
// page in this repo uses, and converts each one into a Phaser texture
// with its black background made transparent (see black-to-transparent.ts)
// so it reads as a sprite silhouette. No Phaser Scene dependency in the
// fetch itself — only loadTransparentTexture needs one, to register the
// result as a usable texture.
import Phaser from 'phaser';
import { createClient } from '@supabase/supabase-js';
import { applyBlackTransparency } from '../utils/black-to-transparent';

const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

export interface DrawingRef {
  name: string;
  storagePath: string;
  url: string;
}

function downloadUrlFor(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
}

// Cycles through the fetched rows (modulo) to always return exactly
// `count` refs, even if the database currently has fewer real drawings
// than that — same tolerant-of-a-small-pool approach as this repo's
// gallery/garabatos/ mosaic wall.
export async function fetchDrawingPool(count: number): Promise<DrawingRef[]> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client
    .from('drawings')
    .select('name, storage_path, created_at')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    return [];
  }

  const pool: DrawingRef[] = [];
  for (let i = 0; i < count; i++) {
    const row = data[i % data.length];
    pool.push({ name: row.name, storagePath: row.storage_path, url: downloadUrlFor(row.storage_path) });
  }
  return pool;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

// Returns false (never throws) on any failure — the caller falls back to
// a generated placeholder texture rather than breaking the game.
export async function loadTransparentTexture(
  scene: Phaser.Scene,
  key: string,
  url: string
): Promise<boolean> {
  try {
    const img = await loadImage(url);
    const canvas = applyBlackTransparency(img, 40);
    scene.textures.addCanvas(key, canvas);
    return true;
  } catch (error) {
    console.error(`garabatos-sprites: failed to load texture "${key}":`, error);
    return false;
  }
}
```

- [ ] **Step 3: Write a temporary verification harness (not committed)**

Create `gogologo-src/_check.html`:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>check</title></head>
<body>
<script type="module">
  import Phaser from 'phaser';
  import { fetchDrawingPool, loadTransparentTexture } from '/src/systems/garabatos-sprites.ts';

  window.checkResults = {};

  class CheckScene extends Phaser.Scene {
    async create() {
      const pool = await fetchDrawingPool(3);
      window.checkResults.poolLength = pool.length;
      window.checkResults.firstUrlStartsWithSupabase =
        pool[0]?.url.startsWith('https://hvysswkivofvscfqysnj.supabase.co') ?? false;

      const ok = await loadTransparentTexture(this, 'check-texture', pool[0].url);
      window.checkResults.loadOk = ok;
      window.checkResults.textureExists = this.textures.exists('check-texture');

      const failOk = await loadTransparentTexture(this, 'check-fail', 'https://example.invalid/nope.png');
      window.checkResults.failHandledGracefully = failOk === false;
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    width: 100,
    height: 100,
    scene: [CheckScene],
  });
</script>
</body>
</html>
```

- [ ] **Step 4: Run it and verify**

With `npm run dev` running, navigate to `http://localhost:5173/_check.html?cb=2`, wait briefly for the async `create()` to finish (poll `browser_evaluate` with `() => window.checkResults.loadOk !== undefined` until `true`, or just wait ~2 seconds and read directly), then `browser_evaluate` with `() => window.checkResults`.

Expected: `{ poolLength: 3, firstUrlStartsWithSupabase: true, loadOk: true, textureExists: true, failHandledGracefully: true }`. This is a real network call to Supabase — requires internet access during verification.

- [ ] **Step 5: Delete the scratch harness and stage the real changes**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
rm _check.html
git status --porcelain .
git add package.json package-lock.json src/systems/garabatos-sprites.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: fetch Garabatos drawings and register them as transparent textures

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 4: Boot, Preload, Menu scenes + save-manager

**Files:**
- Create: `gogologo-src/src/systems/save-manager.ts`
- Create: `gogologo-src/src/scenes/boot-scene.ts`
- Create: `gogologo-src/src/scenes/preload-scene.ts`
- Create: `gogologo-src/src/scenes/menu-scene.ts`
- Modify: `gogologo-src/src/config/game-config.ts` (populate the `scene` array)

**Interfaces:**
- Consumes: `fetchDrawingPool`, `loadTransparentTexture` (Task 3).
- Produces: `getBestScore(): number`, `setBestScoreIfHigher(score: number): void` (`save-manager.ts`). Scene registry key `'drawingTextureKeys': string[]`, set by `PreloadScene`, read by `GameScene` (Task 5) and reused by `GameOverScene` (Task 7).

- [ ] **Step 1: Create `gogologo-src/src/systems/save-manager.ts`**

```ts
// localStorage-based persistence for the best score. Every read/write is
// wrapped in try/catch — private browsing or storage quota errors must
// never block gameplay, same defensive pattern as garabatos/script.js's
// save-throttle helpers elsewhere in this repo.
const BEST_SCORE_KEY = 'gogologo-best-score';

export function getBestScore(): number {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  } catch {
    return 0;
  }
}

export function setBestScoreIfHigher(score: number): void {
  try {
    if (score > getBestScore()) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }
  } catch {
    // Ignore — persistence is a nice-to-have, not core functionality.
  }
}
```

- [ ] **Step 2: Create `gogologo-src/src/scenes/boot-scene.ts`**

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
```

- [ ] **Step 3: Create `gogologo-src/src/scenes/preload-scene.ts`**

```ts
import Phaser from 'phaser';
import { fetchDrawingPool, loadTransparentTexture } from '../systems/garabatos-sprites';

const DRAWING_POOL_SIZE = 12;
const PLACEHOLDER_TEXTURE_KEY = 'placeholder-ship';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  async create(): Promise<void> {
    const loadingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const textureKeys: string[] = [];
    const pool = await fetchDrawingPool(DRAWING_POOL_SIZE);

    for (let i = 0; i < pool.length; i++) {
      const key = `drawing-${i}`;
      const ok = await loadTransparentTexture(this, key, pool[i].url);
      if (ok) textureKeys.push(key);
    }

    if (textureKeys.length === 0) {
      // Supabase down, empty DB, or every fetch failed — never show a
      // silent blank/broken game, same defensive pattern as every other
      // Garabatos-family page in this repo.
      const graphics = this.add.graphics();
      graphics.fillStyle(0xd91023, 1);
      graphics.fillTriangle(16, 0, 0, 32, 32, 32);
      graphics.generateTexture(PLACEHOLDER_TEXTURE_KEY, 32, 32);
      graphics.destroy();
      textureKeys.push(PLACEHOLDER_TEXTURE_KEY);
    }

    this.registry.set('drawingTextureKeys', textureKeys);
    loadingText.destroy();
    this.scene.start('MenuScene');
  }
}
```

- [ ] **Step 4: Create `gogologo-src/src/scenes/menu-scene.ts`**

```ts
import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GOGOLOGO', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(cx, cy, `Best: ${getBestScore()}`, { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to start', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    const start = (): void => {
      this.scene.start('GameScene');
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }
}
```

`GameScene` doesn't exist until Task 5 — this scene reference resolves fine at runtime (Phaser looks up scenes by string key when `start()` is called, not at class-definition time), but the "Tap or press Space to start" transition won't actually go anywhere playable until Task 5 lands. That's expected for this task's own verification (Step 6 below only checks the Menu screen itself renders correctly).

- [ ] **Step 5: Modify `gogologo-src/src/config/game-config.ts`** to populate the scene list

```ts
import Phaser from 'phaser';
import { BootScene } from '../scenes/boot-scene';
import { PreloadScene } from '../scenes/preload-scene';
import { MenuScene } from '../scenes/menu-scene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 720,
  backgroundColor: '#111111',
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
  scene: [BootScene, PreloadScene, MenuScene],
};
```

- [ ] **Step 6: Verify the scene flow**

With `npm run dev` running, navigate to `http://localhost:5173/?cb=3`. Wait ~1-2 seconds for the fetch/preload to finish (real network call), then `browser_evaluate`:

```js
() => {
  const game = window.__gogologoGame;
  return {
    activeScene: game.scene.getScenes(true)[0]?.scene.key,
    textureKeys: game.scene.getScene('PreloadScene').registry.get('drawingTextureKeys'),
  };
}
```

Expected: `activeScene: 'MenuScene'`, `textureKeys` an array of length ≥ 1 (either real `drawing-N` keys or `['placeholder-ship']` if the fetch failed). Check `browser_console_messages` for no unexpected errors (a logged "failed to load texture" per-drawing failure is fine if the overall pool still ends up non-empty — that's the defensive fallback working as designed, not a bug).

- [ ] **Step 7: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/systems/save-manager.ts gogologo-src/src/scenes/boot-scene.ts gogologo-src/src/scenes/preload-scene.ts gogologo-src/src/scenes/menu-scene.ts gogologo-src/src/config/game-config.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add boot/preload/menu scene flow with best-score persistence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 5: Player entity + keyboard input + GameScene (movement/firing only)

**Files:**
- Create: `gogologo-src/src/systems/input-system.ts`
- Create: `gogologo-src/src/entities/player.ts`
- Create: `gogologo-src/src/scenes/game-scene.ts`
- Modify: `gogologo-src/src/config/game-config.ts` (add `GameScene`)

**Interfaces:**
- Consumes: `drawingTextureKeys` from the scene registry (Task 4).
- Produces: `InputController` (`{ getTargetX(currentX: number): number; isFiring(): boolean }`), `createInputController(scene: Phaser.Scene): InputController`. `Player` class with `.sprite`, `.moveToX(x)`, `.fire()`, `.getProjectiles()`.

- [ ] **Step 1: Create `gogologo-src/src/systems/input-system.ts`** (keyboard only — Task 6 adds touch to this same file)

```ts
import Phaser from 'phaser';

export interface InputController {
  getTargetX(currentX: number): number;
  isFiring(): boolean;
}

const KEYBOARD_MOVE_SPEED = 300; // pixels per second

export function createInputController(scene: Phaser.Scene): InputController {
  let targetX: number | null = null;

  const cursors = scene.input.keyboard!.createCursorKeys();
  const keyA = scene.input.keyboard!.addKey('A');
  const keyD = scene.input.keyboard!.addKey('D');
  const keySpace = scene.input.keyboard!.addKey('SPACE');

  return {
    getTargetX(currentX: number): number {
      const base = targetX === null ? currentX : targetX;
      const dt = scene.game.loop.delta / 1000;
      let dx = 0;
      if (cursors.left.isDown || keyA.isDown) dx -= KEYBOARD_MOVE_SPEED * dt;
      if (cursors.right.isDown || keyD.isDown) dx += KEYBOARD_MOVE_SPEED * dt;
      targetX = base + dx;
      return targetX;
    },
    isFiring(): boolean {
      return keySpace.isDown;
    },
  };
}
```

- [ ] **Step 2: Create `gogologo-src/src/entities/player.ts`**

```ts
import Phaser from 'phaser';

const FIRE_COOLDOWN_MS = 350;
const PROJECTILE_SPEED = 500;

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private lastFiredAt = 0;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setCollideWorldBounds(true);
    this.projectiles = scene.physics.add.group();
  }

  moveToX(targetX: number): void {
    const clamped = Phaser.Math.Clamp(targetX, 16, this.scene.scale.width - 16);
    this.sprite.x = clamped;
  }

  fire(): void {
    const now = this.scene.time.now;
    if (now - this.lastFiredAt < FIRE_COOLDOWN_MS) return;
    this.lastFiredAt = now;

    const projectile = this.projectiles.create(
      this.sprite.x,
      this.sprite.y - 20,
      'projectile'
    ) as Phaser.Physics.Arcade.Sprite;
    projectile.setVelocityY(-PROJECTILE_SPEED);
  }

  getProjectiles(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }
}
```

- [ ] **Step 3: Create `gogologo-src/src/scenes/game-scene.ts`**

```ts
import Phaser from 'phaser';
import { createInputController, InputController } from '../systems/input-system';
import { Player } from '../entities/player';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 10);
    graphics.generateTexture('projectile', 4, 10);
    graphics.destroy();

    const textureKeys = this.registry.get('drawingTextureKeys') as string[];
    this.player = new Player(this, textureKeys[0], this.scale.width / 2, this.scale.height - 60);
    this.inputController = createInputController(this);
  }

  update(): void {
    this.player.moveToX(this.inputController.getTargetX(this.player.sprite.x));
    if (this.inputController.isFiring()) {
      this.player.fire();
    }
  }
}
```

- [ ] **Step 4: Modify `gogologo-src/src/config/game-config.ts`** — add the import and append `GameScene` to the array

```ts
import { GameScene } from '../scenes/game-scene';
```

(add alongside the other scene imports)

```ts
  scene: [BootScene, PreloadScene, MenuScene, GameScene],
```

- [ ] **Step 5: Verify movement and firing**

With `npm run dev` running, navigate to `http://localhost:5173/?cb=4`, wait for `MenuScene`, then `browser_evaluate` to jump straight into `GameScene` (avoids fighting with pointer/keyboard simulation on the menu):

```js
() => { window.__gogologoGame.scene.getScene('MenuScene').scene.start('GameScene'); }
```

Then simulate movement — use `browser_evaluate` to read the player's starting x, dispatch synthetic keydown/keyup on the canvas or `document` for `ArrowRight` held across a few animation frames (Phaser polls key state via its own input plugin listening on the game canvas/document, so dispatching real `KeyboardEvent`s at `document` works):

```js
async () => {
  const game = window.__gogologoGame;
  const scene = game.scene.getScene('GameScene');
  const startX = scene['player'].sprite.x;

  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight' }));
  await new Promise((r) => setTimeout(r, 300));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight' }));

  const movedX = scene['player'].sprite.x;
  return { startX, movedX, moved: movedX > startX };
}
```

Expected: `moved: true` (player x increased while ArrowRight was held).

Then verify firing:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const before = scene['player'].getProjectiles().getLength();
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
  await new Promise((r) => setTimeout(r, 50));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
  const after = scene['player'].getProjectiles().getLength();
  return { before, after, fired: after === before + 1 };
}
```

Expected: `fired: true`. Then re-press Space immediately again (within 350ms) and confirm the count does NOT increase a second time — proves the cooldown works.

- [ ] **Step 6: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/systems/input-system.ts gogologo-src/src/entities/player.ts gogologo-src/src/scenes/game-scene.ts gogologo-src/src/config/game-config.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add player movement, firing, and keyboard controls

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 6: Touch controls

**Files:**
- Modify: `gogologo-src/src/systems/input-system.ts` (add touch wiring inside `createInputController`)

**Interfaces:**
- Consumes: nothing new — same `InputController` interface from Task 5, same call site in `game-scene.ts` (no changes needed there).
- Produces: nothing new downstream.

- [ ] **Step 1: Replace `gogologo-src/src/systems/input-system.ts` in full**

```ts
import Phaser from 'phaser';

export interface InputController {
  getTargetX(currentX: number): number;
  isFiring(): boolean;
}

const KEYBOARD_MOVE_SPEED = 300; // pixels per second
const FIRE_BUTTON_RADIUS = 30;
const FIRE_BUTTON_MARGIN = 50;

export function createInputController(scene: Phaser.Scene): InputController {
  let targetX: number | null = null;
  let touchFiring = false;

  const cursors = scene.input.keyboard!.createCursorKeys();
  const keyA = scene.input.keyboard!.addKey('A');
  const keyD = scene.input.keyboard!.addKey('D');
  const keySpace = scene.input.keyboard!.addKey('SPACE');

  const isTouchCapable = 'ontouchstart' in window;
  if (isTouchCapable) {
    const dragZone = scene.add
      .zone(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0)
      .setInteractive();

    const followPointer = (pointer: Phaser.Input.Pointer): void => {
      targetX = pointer.x;
    };
    dragZone.on('pointerdown', followPointer);
    dragZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) followPointer(pointer);
    });

    // Added after dragZone, so it renders on top and Phaser's input
    // plugin gives it hit-test priority over the zone beneath it at the
    // same screen position — a tap here is read as "fire", not a drag.
    const fireButton = scene.add
      .circle(
        scene.scale.width - FIRE_BUTTON_MARGIN,
        scene.scale.height - FIRE_BUTTON_MARGIN,
        FIRE_BUTTON_RADIUS,
        0xd91023,
        0.6
      )
      .setInteractive();
    fireButton.on('pointerdown', () => {
      touchFiring = true;
    });
    fireButton.on('pointerup', () => {
      touchFiring = false;
    });
    fireButton.on('pointerout', () => {
      touchFiring = false;
    });
  }

  return {
    getTargetX(currentX: number): number {
      const base = targetX === null ? currentX : targetX;
      const dt = scene.game.loop.delta / 1000;
      let dx = 0;
      if (cursors.left.isDown || keyA.isDown) dx -= KEYBOARD_MOVE_SPEED * dt;
      if (cursors.right.isDown || keyD.isDown) dx += KEYBOARD_MOVE_SPEED * dt;
      targetX = base + dx;
      return targetX;
    },
    isFiring(): boolean {
      return keySpace.isDown || touchFiring;
    },
  };
}
```

- [ ] **Step 2: Verify touch controls**

The verification browser doesn't naturally report `'ontouchstart' in window` as `true`. Force it before the scene (re)creates its input controller, then reload so the check runs fresh:

```js
() => { window.ontouchstart = null; }
```

(defining this property, even as `null`, makes `'ontouchstart' in window` evaluate `true`)

Then re-navigate to `http://localhost:5173/?cb=5` (fresh load re-runs the `window.ontouchstart = null` requirement — re-run that `browser_evaluate` again immediately after this navigation, before jumping into `GameScene`, since a full page reload resets `window`), jump into `GameScene` the same way as Task 5 Step 5, then verify the drag zone moves the player:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  const startX = scene['player'].sprite.x;

  const canvas = document.querySelector('#game-container canvas');
  const rect = canvas.getBoundingClientRect();
  const targetScreenX = rect.left + rect.width * 0.8;
  const targetScreenY = rect.top + rect.height * 0.5;

  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: targetScreenX, clientY: targetScreenY, pointerId: 1, isPrimary: true, bubbles: true,
  }));
  await new Promise((r) => setTimeout(r, 100));

  const movedX = scene['player'].sprite.x;
  return { startX, movedX, moved: movedX !== startX };
}
```

Expected: `moved: true` (the drag zone's `pointerdown` set `targetX` to the tap position, and `moveToX` snapped the player there).

Then verify the fire button (tap near its known screen position — bottom-right corner, `FIRE_BUTTON_MARGIN` = 50px from each edge at the game's internal 480×720 resolution, scaled by whatever the `FIT` scale mode currently renders at — compute its actual screen position via the canvas's bounding rect and the game's scale manager):

```js
async () => {
  const game = window.__gogologoGame;
  const scene = game.scene.getScene('GameScene');
  const before = scene['player'].getProjectiles().getLength();

  const canvas = document.querySelector('#game-container canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / game.scale.width;
  const scaleY = rect.height / game.scale.height;
  const buttonScreenX = rect.left + (game.scale.width - 50) * scaleX;
  const buttonScreenY = rect.top + (game.scale.height - 50) * scaleY;

  canvas.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: buttonScreenX, clientY: buttonScreenY, pointerId: 2, isPrimary: true, bubbles: true,
  }));
  await new Promise((r) => setTimeout(r, 50));
  canvas.dispatchEvent(new PointerEvent('pointerup', {
    clientX: buttonScreenX, clientY: buttonScreenY, pointerId: 2, isPrimary: true, bubbles: true,
  }));

  const after = scene['player'].getProjectiles().getLength();
  return { before, after, fired: after === before + 1 };
}
```

Expected: `fired: true`. If the tap lands on the drag zone instead of the button (miscalculated coordinates), `fired` will be `false` with no error — adjust the computed screen position and retry rather than assuming a silent pass.

- [ ] **Step 3: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/systems/input-system.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add touch controls (drag-to-move + tap-to-fire)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 7: Enemies, collision, score/lives, game over

**Files:**
- Create: `gogologo-src/src/entities/enemy.ts`
- Modify: `gogologo-src/src/scenes/game-scene.ts` (replace in full — add enemies, collision, score/lives, HUD)
- Create: `gogologo-src/src/scenes/game-over-scene.ts`
- Modify: `gogologo-src/src/config/game-config.ts` (add `GameOverScene`)

**Interfaces:**
- Consumes: `Player`, `createInputController` (Tasks 5-6); `getBestScore`, `setBestScoreIfHigher` (Task 4).
- Produces: `Enemy` class with `.sprite`. `GameOverScene` expects `{ score: number }` passed via `scene.start('GameOverScene', { score })`.

- [ ] **Step 1: Create `gogologo-src/src/entities/enemy.ts`**

```ts
import Phaser from 'phaser';

const ENEMY_SPEED = 80; // pixels per second, downward — no formation/AI yet, sub-project 3's job

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, textureKey: string, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setVelocityY(ENEMY_SPEED);
  }
}
```

- [ ] **Step 2: Replace `gogologo-src/src/scenes/game-scene.ts` in full**

```ts
import Phaser from 'phaser';
import { createInputController, InputController } from '../systems/input-system';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { setBestScoreIfHigher } from '../systems/save-manager';

const ENEMY_SPAWN_INTERVAL_MS = 1000;
const STARTING_LIVES = 3;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private enemies!: Phaser.Physics.Arcade.Group;
  private drawingTextureKeys!: string[];
  private nextEnemyTextureIndex = 0;
  private spawnTimer!: Phaser.Time.TimerEvent;
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
    this.nextEnemyTextureIndex = 0;

    this.player = new Player(
      this,
      this.drawingTextureKeys[0],
      this.scale.width / 2,
      this.scale.height - 60
    );
    this.inputController = createInputController(this);

    this.enemies = this.physics.add.group();
    this.spawnTimer = this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL_MS,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', color: '#ffffff' });
    this.livesText = this.add.text(10, 30, `Lives: ${this.lives}`, {
      fontSize: '16px',
      color: '#ffffff',
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

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.y > this.scale.height + 32) {
        enemy.destroy();
        this.loseLife();
      }
    });
  }

  private spawnEnemy(): void {
    const textureKey =
      this.drawingTextureKeys[this.nextEnemyTextureIndex % this.drawingTextureKeys.length];
    this.nextEnemyTextureIndex++;
    const x = Phaser.Math.Between(32, this.scale.width - 32);
    const enemy = new Enemy(this, textureKey, x, -32);
    this.enemies.add(enemy.sprite);
  }

  private handleProjectileHitsEnemy(
    projectile: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite
  ): void {
    projectile.destroy();
    enemy.destroy();
    this.score += 10;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  private handleEnemyHitsPlayer(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.destroy();
    this.loseLife();
  }

  private loseLife(): void {
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}`);
    if (this.lives <= 0) {
      this.spawnTimer.remove();
      setBestScoreIfHigher(this.score);
      this.scene.start('GameOverScene', { score: this.score });
    }
  }
}
```

- [ ] **Step 3: Create `gogologo-src/src/scenes/game-over-scene.ts`**

```ts
import Phaser from 'phaser';
import { getBestScore } from '../systems/save-manager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: { score: number }): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'GAME OVER', { fontSize: '28px', color: '#ff0000' }).setOrigin(0.5);
    this.add
      .text(cx, cy - 20, `Score: ${data.score}`, { fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 10, `Best: ${getBestScore()}`, { fontSize: '18px', color: '#cccccc' })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 60, 'Tap or press Space to restart', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    const restart = (): void => {
      this.scene.start('GameScene');
    };
    this.input.once('pointerdown', restart);
    this.input.keyboard?.once('keydown-SPACE', restart);
  }
}
```

- [ ] **Step 4: Modify `gogologo-src/src/config/game-config.ts`** — add the import and append `GameOverScene`

```ts
import { GameOverScene } from '../scenes/game-over-scene';
```

```ts
  scene: [BootScene, PreloadScene, MenuScene, GameScene, GameOverScene],
```

- [ ] **Step 5: Verify collision, score, lives, game over, restart**

With `npm run dev` running, navigate fresh, jump into `GameScene` (same technique as Task 5 Step 5), then drive the loop directly rather than waiting on random spawn timing/positions:

```js
async () => {
  const game = window.__gogologoGame;
  const scene = game.scene.getScene('GameScene');

  // Force a deterministic enemy spawn directly on top of the player's
  // projectile path, and fire, to verify projectile-vs-enemy collision
  // (bypassing the random spawn timer/position for a repeatable check).
  const px = scene['player'].sprite.x;
  const EnemyModule = await import('/src/entities/enemy.ts');
  const enemy = new EnemyModule.Enemy(scene, scene['drawingTextureKeys'][0], px, 100);
  scene['enemies'].add(enemy.sprite);

  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
  await new Promise((r) => setTimeout(r, 50));
  document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));

  // Let physics run a few frames for the projectile to reach y=100.
  await new Promise((r) => setTimeout(r, 400));

  return { score: scene['score'], enemyDestroyed: !enemy.sprite.active };
}
```

Expected: `score: 10`, `enemyDestroyed: true`.

Then verify life loss and game over — force `lives` to 1 and trigger a hit directly:

```js
async () => {
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  scene['lives'] = 1;
  scene['livesText'].setText('Lives: 1');
  const EnemyModule = await import('/src/entities/enemy.ts');
  const enemy = new EnemyModule.Enemy(scene, scene['drawingTextureKeys'][0], scene['player'].sprite.x, scene['player'].sprite.y);
  scene['enemies'].add(enemy.sprite);

  await new Promise((r) => setTimeout(r, 200));

  return { activeScene: window.__gogologoGame.scene.getScenes(true)[0]?.scene.key };
}
```

Expected: `activeScene: 'GameOverScene'`. Then check the game-over text and best score:

```js
() => {
  const scene = window.__gogologoGame.scene.getScene('GameOverScene');
  return { bestScoreDisplayed: scene.children.list.some((c) => c.text?.includes('Best:')) };
}
```

Expected: `bestScoreDisplayed: true`. Then dispatch Space again and confirm it returns to a fresh `GameScene` with `lives` reset to 3:

```js
async () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
  await new Promise((r) => setTimeout(r, 100));
  const scene = window.__gogologoGame.scene.getScene('GameScene');
  return { activeScene: window.__gogologoGame.scene.getScenes(true)[0]?.scene.key, lives: scene['lives'] };
}
```

Expected: `activeScene: 'GameScene'`, `lives: 3`.

- [ ] **Step 6: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo-src/src/entities/enemy.ts gogologo-src/src/scenes/game-scene.ts gogologo-src/src/scenes/game-over-scene.ts gogologo-src/src/config/game-config.ts
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add enemies, collision, score/lives, and game-over/restart

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 8: Production build verification + deploy

**Files:**
- No new source files — rebuilds `gogologo/` (the deployed static output) from the now-complete `gogologo-src/`.

**Interfaces:** none.

- [ ] **Step 1: Build**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo-src"
npm run build
ls -la "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/gogologo"
```

- [ ] **Step 2: Serve exactly the way production serves it — plain static files, no Vite dev server**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && python3 -m http.server 8000
```

Navigate to `http://localhost:8000/gogologo/?cb=final1`. This is the first time this exact code path (the `base: '/gogologo/'` asset resolution under a real static file server, not Vite's dev server) has been exercised — dev-server behavior can hide base-path bugs that only surface under real static hosting, so this check matters, not just a formality.

- [ ] **Step 3: Full end-to-end pass on the built output**

Repeat the key checks from Tasks 5-7 against `http://localhost:8000/gogologo/` instead of the Vite dev server: menu loads with real (or placeholder-fallback) drawing textures, keyboard movement/firing work, touch movement/firing work (force `window.ontouchstart = null` again, same technique as Task 6), collision/score/lives/game-over/restart all work, `browser_console_messages` shows no errors.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gogologo/
git status --porcelain gogologo/
```

Confirm with the user before `git commit`. Suggested message:

```
build: gogologo production bundle (core engine, v0.1.0)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

**This task completes the plan.** Do not push, do not merge/promote anything, and do not start on sub-project 2 (character select) — those are separate steps the user directs explicitly, per this repo's established norm this whole session.
