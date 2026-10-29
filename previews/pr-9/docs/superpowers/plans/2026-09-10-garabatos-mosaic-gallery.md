# Garabatos Mosaic Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen photomosaic page at `gallery/garabatos/` that arranges every saved Garabatos drawing into a tile wall tracing the word "GARABATOS," a reusable mosaic engine behind it, a stub page for a future custom-target version, and a redirect from the old `garabatos/gallery/` path.

**Architecture:** A small, DOM-free `mosaic-engine.js` (mask building, per-drawing density scoring, tile packing) is called by page-specific `script.js` glue that fetches drawings from Supabase and renders `<figure>` tiles into a CSS grid. Black (unscratched) pixels in each tile are filled with an animated CSS gradient via `mix-blend-mode: lighten`; tile size/opacity and the noise layer's speed/opacity are driven by each drawing's density score through inline CSS custom properties.

**Tech Stack:** Plain HTML/CSS/JS, no build step, no framework (matches the rest of this repo). Supabase JS client (already used by `garabatos/gallery.js`) for data. Canvas 2D API for mask generation and density sampling. Playwright (MCP) + `python3 -m http.server` for manual verification (this repo has no test framework).

**Spec:** `docs/superpowers/specs/2026-09-10-garabatos-mosaic-gallery-design.md`

## Global Constraints

- No build step, no npm dependencies — plain `<script src>` tags only, matching every other page in this repo.
- Supabase project URL: `https://hvysswkivofvscfqysnj.supabase.co`. Anon key (public, already used client-side elsewhere in this repo): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70`.
- Supabase JS UMD script tag (copy verbatim from `garabatos/index.html`): `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>`.
- All new pages get bilingual (`es`/`en`) content via the existing `[data-i18n-es]`/`[data-i18n-en]` pattern, and must include the local CSS rule for it (`html[data-lang="es"] [data-i18n-en], html[data-lang="en"] [data-i18n-es] { display: none; }`) since none of these pages link the main site's `/styles.css`.
- Blank/unscratched canvas color (from `garabatos/canvas.js`): `#111111`.
- Every new page includes `<site-topbar></site-topbar>` and `<site-footer base="/index.html"></site-footer>`, loaded via `<script src="/libs/personal/site-chrome.js?v=20260909h"></script>` in `<head>`.
- Comic Relief font loading (copy verbatim from `garabatos/index.html`):
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comic+Relief:wght@400;700&display=swap">
  ```
- This repo has no automated test framework. Verification is manual: serve the repo root with `python3 -m http.server 8000` from the deploy repo root, then drive a real browser via the Playwright MCP tools (`mcp__plugin_playwright_playwright__browser_navigate`, `browser_evaluate`, `browser_console_messages`, `browser_take_screenshot`, `browser_resize`). Always append a unique cache-busting query string when re-navigating to a page you already visited in the same browser session — this repo has repeatedly hit stale-cache false positives otherwise.
- Never `git commit` or `git push` without explicit user authorization for that specific commit — this overrides the "commit at the end of every step" default some skills assume. When a step below says "Commit," treat it as "stage these exact files, ready to commit" and confirm with the user before running `git commit`, unless the user has already told you to commit through the whole plan.
- Work happens in the deploy repo: `/Users/hicor13/Website/hicor13.github.io/hicor13.github.io`. Do not touch `/gallery/pajaritos/`. After the deploy repo is verified working, the same files get copied to the source repo (`/Users/hicor13/Library/CloudStorage/OneDrive-Personal/Documentos/Proyectos/Resume-Site`) and committed there too — this is a separate, later step the user will direct explicitly, not part of this plan's tasks.

---

### Task 1: Mosaic engine (`mosaic-engine.js`)

**Files:**
- Create: `gallery/garabatos/mosaic-engine.js`

**Interfaces:**
- Produces: `window.Garabatos.mosaic.buildMask(source, cols, rows)` → `boolean[rows][cols]`. `source` is a `string` (rendered as bold text) or an `HTMLImageElement` (drawn scaled to fill the mask canvas).
- Produces: `window.Garabatos.mosaic.densityScore(imgEl)` → `number` in `[0, 1]`. `imgEl` must already be loaded (`naturalWidth > 0`).
- Produces: `window.Garabatos.mosaic.packTiles(mask, drawings)` → `{ row: number, col: number, drawing: T }[]`, where `T` is whatever element type `drawings` holds (opaque to the engine — it never reads drawing fields).

This task has no earlier tasks to consume from.

- [ ] **Step 1: Write a temporary verification harness (not committed)**

Start the local server so relative script paths resolve normally:

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && python3 -m http.server 8000
```

Create `gallery/garabatos/_check.html` — placed directly in the target
directory so `<script src="mosaic-engine.js">` resolves with no path
gymnastics. This file is deleted in Step 6, before anything is staged for
commit, so it never enters the repo's history:

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>mosaic-engine check</title></head>
<body>
<script src="mosaic-engine.js"></script>
<script>
window.checkResults = {};

try {
  window.checkResults.hasBuildMask = typeof Garabatos.mosaic.buildMask === 'function';
  window.checkResults.hasDensityScore = typeof Garabatos.mosaic.densityScore === 'function';
  window.checkResults.hasPackTiles = typeof Garabatos.mosaic.packTiles === 'function';
} catch (e) {
  window.checkResults.loadError = e.message;
}
</script>
</body>
</html>
```

- [ ] **Step 2: Run it and confirm it fails**

Use `mcp__plugin_playwright_playwright__browser_navigate` to open `http://localhost:8000/gallery/garabatos/_check.html`, then `mcp__plugin_playwright_playwright__browser_evaluate` with `() => window.checkResults`.

Expected: `{ loadError: undefined, hasBuildMask: false, hasDensityScore: false, hasPackTiles: false }` or a script-load 404 in `browser_console_messages` — `Garabatos.mosaic` doesn't exist yet, since `mosaic-engine.js` doesn't exist yet.

- [ ] **Step 3: Implement `mosaic-engine.js`**

```js
// gallery/garabatos/mosaic-engine.js
//
// Pure, DOM-adjacent (canvas only, no page elements) mosaic logic shared by
// gallery/garabatos/ and gallery/garabatos-custom/. No Supabase, no fetch,
// no rendering of the actual tile DOM — just: what shape should the wall
// take (buildMask), how "finished" is one drawing (densityScore), and
// which drawing goes in which cell (packTiles).
window.Garabatos = window.Garabatos || {};

Garabatos.mosaic = (function () {
  // Same blank-canvas color as canvas.js's paint() fill — a drawing that's
  // never been touched is entirely this color.
  const BLANK_R = 0x11;
  const BLANK_G = 0x11;
  const BLANK_B = 0x11;
  const SCRATCH_DISTANCE_THRESHOLD = 40;

  function buildMask(source, cols, rows) {
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cols, rows);
    ctx.fillStyle = '#ffffff';

    if (typeof source === 'string') {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      let fontSize = rows;
      const fontStack = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
      ctx.font = `bold ${fontSize}px ${fontStack}`;
      while (ctx.measureText(source).width > cols * 0.94 && fontSize > 1) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px ${fontStack}`;
      }
      ctx.fillText(source, cols / 2, rows / 2 + 1);
    } else {
      ctx.drawImage(source, 0, 0, cols, rows);
    }

    const pixels = ctx.getImageData(0, 0, cols, rows).data;
    const mask = [];
    for (let row = 0; row < rows; row++) {
      const rowCells = [];
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 4;
        rowCells.push(pixels[idx] > 128);
      }
      mask.push(rowCells);
    }
    return mask;
  }

  function densityScore(imgEl) {
    const width = 64;
    const height = 40;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const total = width * height;
    let scratched = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = pixels[i] - BLANK_R;
      const dg = pixels[i + 1] - BLANK_G;
      const db = pixels[i + 2] - BLANK_B;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance > SCRATCH_DISTANCE_THRESHOLD) scratched++;
    }
    return scratched / total;
  }

  function packTiles(mask, drawings) {
    const cells = [];
    for (let row = 0; row < mask.length; row++) {
      for (let col = 0; col < mask[row].length; col++) {
        if (mask[row][col]) cells.push({ row, col });
      }
    }
    if (drawings.length === 0 || cells.length === 0) return [];

    const shuffled = drawings.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    const placed = new Map();
    const keyFor = (row, col) => `${row},${col}`;
    const neighborsOf = (row, col) => [
      placed.get(keyFor(row - 1, col)),
      placed.get(keyFor(row + 1, col)),
      placed.get(keyFor(row, col - 1)),
      placed.get(keyFor(row, col + 1)),
    ].filter((d) => d !== undefined);

    const tiles = [];
    let cursor = 0;
    cells.forEach(({ row, col }) => {
      let candidate = shuffled[cursor % shuffled.length];
      if (shuffled.length > 1) {
        const neighbors = neighborsOf(row, col);
        let attempts = 0;
        while (neighbors.indexOf(candidate) !== -1 && attempts < shuffled.length) {
          cursor++;
          candidate = shuffled[cursor % shuffled.length];
          attempts++;
        }
      }
      cursor++;
      placed.set(keyFor(row, col), candidate);
      tiles.push({ row, col, drawing: candidate });
    });

    return tiles;
  }

  return { buildMask, densityScore, packTiles };
})();
```

- [ ] **Step 4: Re-run the harness and confirm it passes**

Re-navigate to `http://localhost:8000/gallery/garabatos/_check.html?cb=1` (cache-busting query string, since this is the same URL path revisited in the same browser session) and re-run the same `browser_evaluate`.

Expected: `{ hasBuildMask: true, hasDensityScore: true, hasPackTiles: true }`, no `loadError`.

- [ ] **Step 5: Behavioral checks via the harness**

Extend the harness `<script>` block to also compute and store:

```js
window.checkResults.maskShape = (() => {
  const mask = Garabatos.mosaic.buildMask('GARABATOS', 48, 14);
  return { rows: mask.length, cols: mask[0].length, anyTrue: mask.some(r => r.some(c => c)), anyFalse: mask.some(r => r.some(c => !c)) };
})();

window.checkResults.densityOfBlack = (() => {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 400;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 640, 400);
  const img = new Image();
  img.src = c.toDataURL();
  return 'pending'; // see note below — Image needs a load event
})();

window.checkResults.packTilesNoAdjacentDupes = (() => {
  const mask = [[true, true, true, true, true]];
  const drawings = ['a', 'b', 'c'];
  const tiles = Garabatos.mosaic.packTiles(mask, drawings);
  let anyAdjacentDupe = false;
  for (let i = 1; i < tiles.length; i++) {
    if (tiles[i].drawing === tiles[i - 1].drawing) anyAdjacentDupe = true;
  }
  return { count: tiles.length, anyAdjacentDupe };
})();
```

For `densityScore`, since it needs a loaded `<img>`, run this as its own `browser_evaluate` call using an async function so you can `await` the image's `onload`:

```js
async () => {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 400;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 640, 400);
  const blankImg = new Image();
  const blankReady = new Promise((res) => { blankImg.onload = res; });
  blankImg.src = c.toDataURL();
  await blankReady;

  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, 640, 400);
  const fullImg = new Image();
  const fullReady = new Promise((res) => { fullImg.onload = res; });
  fullImg.src = c.toDataURL();
  await fullReady;

  return {
    blank: Garabatos.mosaic.densityScore(blankImg),
    full: Garabatos.mosaic.densityScore(fullImg),
  };
}
```

Expected: `maskShape` → `{ rows: 14, cols: 48, anyTrue: true, anyFalse: true }`. Density check → `blank` close to `0` (under `0.05`), `full` close to `1` (over `0.95`). `packTilesNoAdjacentDupes` → `{ count: 5, anyAdjacentDupe: false }` (3 drawings cycling across 5 cells in a line can always avoid adjacent repeats).

If any of these don't hold, fix `mosaic-engine.js` and re-run — do not proceed to Task 2 with a failing check.

- [ ] **Step 6: Delete the scratch harness file** and stage the real file:

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
rm gallery/garabatos/_check.html
git status --porcelain gallery/garabatos/   # confirm _check.html is gone, mosaic-engine.js is untracked
git add gallery/garabatos/mosaic-engine.js
```

Confirm with the user before running `git commit` (see Global Constraints). Suggested message:

```
feat: add Garabatos mosaic engine (mask, density scoring, tile packing)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 2: `gallery/garabatos/` page scaffold — fetch, empty, error states

**Files:**
- Create: `gallery/garabatos/index.html`
- Create: `gallery/garabatos/styles.css`
- Create: `gallery/garabatos/script.js`

**Interfaces:**
- Consumes: nothing from Task 1 yet (mosaic rendering is Task 3) — this task only gets the page loading, fetching, and showing empty/error states correctly.
- Produces: `#mosaic-grid` and `#mosaic-status` elements in the DOM that Task 3 will populate.

- [ ] **Step 1: Create `gallery/garabatos/index.html`**

```html
<!DOCTYPE html>
<html lang="es-PE" data-lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Galería Garabatos — Mario Cornejo</title>
  <meta name="description" content="Mosaico en vivo: cada garabato guardado se convierte en una teja de un mural que forma la palabra GARABATOS.">
  <meta name="keywords" content="garabatos, mosaico, arte comunitario, scratch art, mario cornejo">
  <meta name="author" content="Mario Cornejo">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://mariocornejo.com/gallery/garabatos/">
  <link rel="icon" href="/favicon.ico" sizes="any">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mariocornejo.com/gallery/garabatos/">
  <meta property="og:title" content="Galería Garabatos — Mario Cornejo">
  <meta property="og:description" content="Mosaico en vivo hecho de garabatos guardados por visitantes.">
  <meta property="og:image" content="https://mariocornejo.com/garabatos/og-image.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comic+Relief:wght@400;700&display=swap">
  <link rel="stylesheet" href="styles.css?v=20260910a">
  <script src="/libs/personal/site-chrome.js?v=20260909h"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>
</head>
<body>
  <site-topbar></site-topbar>

  <main>
    <section class="mosaic-wall" aria-label="Mosaico de garabatos">
      <h1 class="mosaic-heading">
        <span data-i18n-es>La palabra GARABATOS, hecha de garabatos</span>
        <span data-i18n-en>The word GARABATOS, made of doodles</span>
      </h1>
      <div id="mosaic-grid" class="mosaic-grid"></div>
      <p id="mosaic-status" class="mosaic-status" role="status" aria-live="polite"></p>
      <p class="mosaic-back">
        <a href="/garabatos/">&larr; <span data-i18n-es>Volver a Garabatos</span><span data-i18n-en>Back to Garabatos</span></a>
      </p>
    </section>
  </main>

  <site-footer base="/index.html"></site-footer>

  <script src="mosaic-engine.js?v=20260910a"></script>
  <script src="script.js?v=20260910a"></script>
</body>
</html>
```

- [ ] **Step 2: Create `gallery/garabatos/styles.css`**

```css
/* gallery/garabatos/styles.css
   Standalone stylesheet — no /styles.css link, same precedent as
   garabatos/styles.css and gallery/pajaritos/styles.css. */

html[data-lang="es"] [data-i18n-en],
html[data-lang="en"] [data-i18n-es] {
  display: none;
}

html,
body {
  background: #05040a;
  margin: 0;
  color: #ffffff;
  font-family: 'Comic Relief', 'Comic Sans MS', 'Comic Sans', cursive, sans-serif;
}

.mosaic-wall {
  padding: 7rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.mosaic-heading {
  margin: 0;
  font-size: 1.3rem;
  max-width: 32rem;
}

.mosaic-grid {
  display: grid;
  gap: 2px;
  width: 100%;
  max-width: 90rem;
}

.mosaic-status {
  min-height: 1.2em;
  font-size: 1rem;
  color: #ffffff;
}

.mosaic-back a {
  color: #00fff2;
  text-decoration: none;
}

.mosaic-back a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Create `gallery/garabatos/script.js`** (fetch + empty/error states only — tile rendering is stubbed for Task 3)

```js
// gallery/garabatos/script.js
//
// Fetches every saved drawing, scores each one's "density" (how much got
// scratched — see mosaic-engine.js), and asks the engine to pack them into
// a tile layout tracing the word GARABATOS. Rendering the actual tile DOM
// (with the black-fill blend effect) happens here too, added in a follow-up
// pass — this version establishes fetch + empty/error states.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const MESSAGES = {
    empty: {
      es: 'Todavía no hay garabatos guardados.',
      en: 'No doodles saved yet.',
    },
    error: {
      es: 'No se pudo cargar el mosaico.',
      en: "Couldn't load the mosaic.",
    },
  };

  function downloadUrlFor(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
  }

  function renderStatus(gridEl, statusEl, key) {
    gridEl.innerHTML = '';
    const msgs = MESSAGES[key];
    statusEl.innerHTML =
      `<span data-i18n-es>${msgs.es}</span><span data-i18n-en>${msgs.en}</span>`;
  }

  async function init() {
    const gridEl = document.getElementById('mosaic-grid');
    const statusEl = document.getElementById('mosaic-status');
    if (!gridEl || !statusEl) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let rows;
    try {
      const { data, error } = await client
        .from('drawings')
        .select('name, storage_path, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data;
    } catch (error) {
      console.error('Garabatos mosaic: failed to fetch drawings:', error);
      renderStatus(gridEl, statusEl, 'error');
      return;
    }

    if (rows.length === 0) {
      renderStatus(gridEl, statusEl, 'empty');
      return;
    }

    // Tile rendering wired up in Task 3 — for now, prove the fetch worked.
    statusEl.textContent = '';
    window.__mosaicFetchedRows = rows; // read by Task 2's verification step only
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 4: Manual verification — empty/error states**

Start the server:

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io" && python3 -m http.server 8000
```

Use `mcp__plugin_playwright_playwright__browser_navigate` to `http://localhost:8000/gallery/garabatos/index.html?cb=1`, then `browser_console_messages` (expect no errors), then `browser_evaluate` with `() => window.__mosaicFetchedRows.length` — expect `16` (the current known row count; a different positive number is also fine, it just means the DB has grown, which is expected over time).

To check the error state: temporarily edit `script.js` in the browser via `browser_evaluate` is not possible for a `<script src>` file, so instead verify the error path by reasoning: the `try/catch` around the Supabase call covers network failure and `error` from Supabase — this is the same pattern as `garabatos/gallery.js`'s `init()`, already proven correct in production. Confirm the empty-state path is reachable by testing `renderStatus(gridEl, statusEl, 'empty')` directly via `browser_evaluate`:

```js
() => {
  const gridEl = document.getElementById('mosaic-grid');
  const statusEl = document.getElementById('mosaic-status');
  gridEl.innerHTML = '<div>fake tile</div>';
  statusEl.textContent = '';
  // Can't call the IIFE's private renderStatus directly (not exposed) —
  // instead confirm the DOM elements it would touch exist and are empty
  // before init() runs, which the earlier fetch-row check already proved
  // (rows.length === 16 means the empty branch was correctly skipped).
  return { gridHasChildren: gridEl.children.length > 0, statusEmpty: statusEl.textContent === '' };
}
```

Expected: `{ gridHasChildren: true, statusEmpty: true }` — confirms the elements are reachable and the non-empty path left status blank as designed.

- [ ] **Step 5: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gallery/garabatos/index.html gallery/garabatos/styles.css gallery/garabatos/script.js
```

Confirm with the user before `git commit`. Suggested message:

```
feat: scaffold gallery/garabatos/ page (fetch, empty/error states)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 3: Wire the mosaic engine — tile rendering, density styling, black-fill blend effect

**Files:**
- Modify: `gallery/garabatos/script.js` (replace the Task 2 stub `init()` body)
- Modify: `gallery/garabatos/styles.css` (add tile/noise rules)

**Interfaces:**
- Consumes: `Garabatos.mosaic.buildMask`, `Garabatos.mosaic.densityScore`, `Garabatos.mosaic.packTiles` (Task 1). `#mosaic-grid`, `#mosaic-status` (Task 2).
- Produces: nothing further downstream — this completes `gallery/garabatos/`.

- [ ] **Step 1: Replace `gallery/garabatos/script.js` in full**

```js
// gallery/garabatos/script.js
//
// Fetches every saved drawing, scores each unique one's "density" (how
// much got scratched — mosaic-engine.js's densityScore), asks the engine
// to pack them into a tile layout tracing the word GARABATOS, then renders
// each tile as a two-layer <figure>: an animated noise div behind, the
// drawing on top with mix-blend-mode:lighten so black (unscratched) pixels
// let the noise glow through while the drawing's own bright strokes stay
// dominant. Density also drives each tile's size/opacity and the noise
// layer's speed/opacity via inline CSS custom properties.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const COLS = 48;
  const ROWS = 14;

  const MESSAGES = {
    empty: {
      es: 'Todavía no hay garabatos guardados.',
      en: 'No doodles saved yet.',
    },
    error: {
      es: 'No se pudo cargar el mosaico.',
      en: "Couldn't load the mosaic.",
    },
  };

  function downloadUrlFor(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  function styleForDensity(score) {
    const clamped = Math.max(0, Math.min(1, score));
    return {
      scale: (0.6 + clamped * 0.5).toFixed(3),
      opacity: (0.6 + clamped * 0.4).toFixed(3),
      noiseDuration: (3 + clamped * 4).toFixed(2) + 's',
      noiseOpacity: (0.75 - clamped * 0.35).toFixed(3),
    };
  }

  function renderTile(tile) {
    const figure = document.createElement('figure');
    figure.className = 'mosaic-tile';
    figure.style.gridColumn = String(tile.col + 1);
    figure.style.gridRow = String(tile.row + 1);

    const style = styleForDensity(tile.drawing.density);
    figure.style.setProperty('--tile-scale', style.scale);
    figure.style.setProperty('--tile-opacity', style.opacity);
    figure.style.setProperty('--noise-duration', style.noiseDuration);
    figure.style.setProperty('--noise-opacity', style.noiseOpacity);

    const noise = document.createElement('div');
    noise.className = 'mosaic-noise';

    const img = document.createElement('img');
    img.src = downloadUrlFor(tile.drawing.storage_path);
    img.alt = tile.drawing.name;
    img.loading = 'lazy';

    figure.appendChild(noise);
    figure.appendChild(img);
    return figure;
  }

  function renderStatus(gridEl, statusEl, key) {
    gridEl.innerHTML = '';
    const msgs = MESSAGES[key];
    statusEl.innerHTML =
      `<span data-i18n-es>${msgs.es}</span><span data-i18n-en>${msgs.en}</span>`;
  }

  async function init() {
    const gridEl = document.getElementById('mosaic-grid');
    const statusEl = document.getElementById('mosaic-status');
    if (!gridEl || !statusEl) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let rows;
    try {
      const { data, error } = await client
        .from('drawings')
        .select('name, storage_path, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data;
    } catch (error) {
      console.error('Garabatos mosaic: failed to fetch drawings:', error);
      renderStatus(gridEl, statusEl, 'error');
      return;
    }

    if (rows.length === 0) {
      renderStatus(gridEl, statusEl, 'empty');
      return;
    }

    statusEl.textContent = '';

    const densityCache = new Map();
    const drawings = [];
    for (const row of rows) {
      if (!densityCache.has(row.storage_path)) {
        try {
          const img = await loadImage(downloadUrlFor(row.storage_path));
          densityCache.set(row.storage_path, Garabatos.mosaic.densityScore(img));
        } catch (error) {
          console.error('Garabatos mosaic: failed to score drawing:', error);
          densityCache.set(row.storage_path, 0.5);
        }
      }
      drawings.push({
        name: row.name,
        storage_path: row.storage_path,
        density: densityCache.get(row.storage_path),
      });
    }

    const mask = Garabatos.mosaic.buildMask('GARABATOS', COLS, ROWS);
    const tiles = Garabatos.mosaic.packTiles(mask, drawings);

    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    gridEl.style.aspectRatio = `${COLS} / ${ROWS}`;

    tiles.forEach((tile) => gridEl.appendChild(renderTile(tile)));
    window.__mosaicTileCount = tiles.length; // read by verification step only
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: Add tile/noise CSS to `gallery/garabatos/styles.css`** (append after `.mosaic-back a:hover`)

```css
.mosaic-tile {
  position: relative;
  overflow: hidden;
  border-radius: 3px;
  transform: scale(var(--tile-scale, 1));
  opacity: var(--tile-opacity, 1);
  transition: transform 0.6s ease, opacity 0.6s ease;
}

.mosaic-noise {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, #ff00c8, #7700ff, #00fff2, #fffb00, #ff00c8);
  background-size: 400% 400%;
  opacity: var(--noise-opacity, 0.5);
  animation: mosaic-noise-shift var(--noise-duration, 5s) linear infinite;
}

@keyframes mosaic-noise-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.mosaic-tile img {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: lighten;
  image-rendering: pixelated;
}
```

- [ ] **Step 3: Manual verification — desktop**

Bump the cache-bust suffix on all three changed files in `index.html` (`?v=20260910a` → `?v=20260910b`) before this check, so the browser can't serve a stale copy.

`browser_resize` to `1280x900`, `browser_navigate` to `http://localhost:8000/gallery/garabatos/index.html?cb=2`, then `browser_evaluate`:

```js
() => ({
  tileCount: window.__mosaicTileCount,
  gridChildren: document.getElementById('mosaic-grid').children.length,
  firstTileHasNoiseAndImg: (() => {
    const t = document.querySelector('.mosaic-tile');
    return !!(t && t.querySelector('.mosaic-noise') && t.querySelector('img'));
  })(),
  densityVaries: (() => {
    const scales = Array.from(document.querySelectorAll('.mosaic-tile'))
      .map(t => t.style.getPropertyValue('--tile-scale'));
    return new Set(scales).size > 1;
  })(),
})
```

Expected: `tileCount` equal to `gridChildren` (both > 100 given the current 48×14 mask), `firstTileHasNoiseAndImg: true`, `densityVaries: true` (with 16 real drawings of varying scratch coverage, tile scale should not be uniform). Take a screenshot via `browser_take_screenshot` and visually confirm the tiles roughly trace "GARABATOS" — if the wordmark doesn't read clearly, adjust `COLS`/`ROWS` in `script.js` (try values between 40×12 and 56×16) and re-verify; this tuning is expected per the spec's data-flow note.

- [ ] **Step 4: Manual verification — mobile**

`browser_resize` to `375x812`, re-navigate with a fresh cache-bust query string, re-run the same `browser_evaluate`. Expected: same shape of results (tile count/children match, density varies). Take a screenshot and confirm the mosaic is still legible at this width — if tiles are too small to read as a wordmark on mobile, that's an acceptable trade-off per the spec (this is an ambient piece, not a UI that must be readable at every size), but note it if it looks broken (e.g., overlapping badly) rather than just small.

- [ ] **Step 5: Check console cleanliness**

`browser_console_messages` on both viewports from Steps 3–4 — expect no errors. `net::ERR_` messages for individual drawing images are not expected (all 16 should load from Supabase Storage, which is public per the existing gallery's working setup) — if any do appear, investigate before proceeding (per this repo's root-cause-first debugging norm, don't just suppress the message).

- [ ] **Step 6: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gallery/garabatos/script.js gallery/garabatos/styles.css gallery/garabatos/index.html
```

Confirm with the user before `git commit`. Suggested message:

```
feat: render mosaic tiles with density-driven sizing and black-fill blend effect

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 4: Redirect stub (`garabatos/gallery/index.html`)

**Files:**
- Modify (or create, if it doesn't already exist as a real page): `garabatos/gallery/index.html`

**Interfaces:** none — standalone.

- [ ] **Step 1: Check what's currently at this path**

```bash
cat "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io/garabatos/gallery/index.html" 2>&1
```

If this returns "No such file or directory," there's nothing to preserve — proceed to Step 2. If it returns real content, stop and confirm with the user before overwriting it (per this repo's "investigate unfamiliar state before overwriting" norm) — it may be in-progress work from elsewhere.

- [ ] **Step 2: Write the redirect**

```html
<!DOCTYPE html>
<html lang="es-PE">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; URL=https://mariocornejo.com/gallery/garabatos/">
  <link rel="canonical" href="https://mariocornejo.com/gallery/garabatos/">
  <meta name="robots" content="noindex, follow">
  <title>Redirecting…</title>
</head>
<body>
  <p>Redirecting to <a href="https://mariocornejo.com/gallery/garabatos/">https://mariocornejo.com/gallery/garabatos/</a>…</p>
</body>
</html>
```

- [ ] **Step 3: Manual verification**

`browser_navigate` to `http://localhost:8000/garabatos/gallery/index.html?cb=1`. Expected: the browser lands on `/gallery/garabatos/` (the meta-refresh fires with `content="0; ..."`, i.e. immediately) — confirm via `browser_evaluate` with `() => window.location.pathname`, expect `/gallery/garabatos/`.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add garabatos/gallery/index.html
```

Confirm with the user before `git commit`. Suggested message:

```
feat: redirect garabatos/gallery/ to gallery/garabatos/

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 5: Stub page (`gallery/garabatos-custom/`)

**Files:**
- Create: `gallery/garabatos-custom/index.html`
- Create: `gallery/garabatos-custom/script.js`

**Interfaces:**
- Consumes: `Garabatos.mosaic.*` (Task 1, via `<script src="../garabatos/mosaic-engine.js">`).
- Produces: nothing downstream.

- [ ] **Step 1: Create `gallery/garabatos-custom/index.html`**

```html
<!DOCTYPE html>
<html lang="es-PE" data-lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Galería Garabatos (personalizada) — Mario Cornejo</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/favicon.ico" sizes="any">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comic+Relief:wght@400;700&display=swap">
  <link rel="stylesheet" href="../garabatos/styles.css?v=20260910a">
  <script src="/libs/personal/site-chrome.js?v=20260909h"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>
</head>
<body>
  <site-topbar></site-topbar>

  <main>
    <section class="mosaic-wall" aria-label="Mosaico de garabatos (personalizado)">
      <h1 class="mosaic-heading">
        <span data-i18n-es>Mosaico personalizado (en construcción)</span>
        <span data-i18n-en>Custom mosaic (under construction)</span>
      </h1>
      <div id="mosaic-grid" class="mosaic-grid"></div>
      <p id="mosaic-status" class="mosaic-status" role="status" aria-live="polite"></p>
      <p class="mosaic-back">
        <a href="/garabatos/">&larr; <span data-i18n-es>Volver a Garabatos</span><span data-i18n-en>Back to Garabatos</span></a>
      </p>
    </section>
  </main>

  <site-footer base="/index.html"></site-footer>

  <script src="../garabatos/mosaic-engine.js?v=20260910a"></script>
  <script src="script.js?v=20260910a"></script>
</body>
</html>
```

- [ ] **Step 2: Create `gallery/garabatos-custom/script.js`**

Byte-for-byte the same as Task 3's final `gallery/garabatos/script.js`, except the single marked line inside `init()` that builds the mask:

```js
// gallery/garabatos-custom/script.js
//
// Same engine, same fetch/scoring/render flow as gallery/garabatos/ — the
// only difference is the mask source (see the TODO below). Kept as a full
// copy rather than a shared module because the two pages are meant to
// diverge here: this one gets a custom target-image workflow built on top
// later, and that shouldn't risk changing gallery/garabatos/'s behavior.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const COLS = 48;
  const ROWS = 14;

  const MESSAGES = {
    empty: {
      es: 'Todavía no hay garabatos guardados.',
      en: 'No doodles saved yet.',
    },
    error: {
      es: 'No se pudo cargar el mosaico.',
      en: "Couldn't load the mosaic.",
    },
  };

  function downloadUrlFor(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  function styleForDensity(score) {
    const clamped = Math.max(0, Math.min(1, score));
    return {
      scale: (0.6 + clamped * 0.5).toFixed(3),
      opacity: (0.6 + clamped * 0.4).toFixed(3),
      noiseDuration: (3 + clamped * 4).toFixed(2) + 's',
      noiseOpacity: (0.75 - clamped * 0.35).toFixed(3),
    };
  }

  function renderTile(tile) {
    const figure = document.createElement('figure');
    figure.className = 'mosaic-tile';
    figure.style.gridColumn = String(tile.col + 1);
    figure.style.gridRow = String(tile.row + 1);

    const style = styleForDensity(tile.drawing.density);
    figure.style.setProperty('--tile-scale', style.scale);
    figure.style.setProperty('--tile-opacity', style.opacity);
    figure.style.setProperty('--noise-duration', style.noiseDuration);
    figure.style.setProperty('--noise-opacity', style.noiseOpacity);

    const noise = document.createElement('div');
    noise.className = 'mosaic-noise';

    const img = document.createElement('img');
    img.src = downloadUrlFor(tile.drawing.storage_path);
    img.alt = tile.drawing.name;
    img.loading = 'lazy';

    figure.appendChild(noise);
    figure.appendChild(img);
    return figure;
  }

  function renderStatus(gridEl, statusEl, key) {
    gridEl.innerHTML = '';
    const msgs = MESSAGES[key];
    statusEl.innerHTML =
      `<span data-i18n-es>${msgs.es}</span><span data-i18n-en>${msgs.en}</span>`;
  }

  async function init() {
    const gridEl = document.getElementById('mosaic-grid');
    const statusEl = document.getElementById('mosaic-status');
    if (!gridEl || !statusEl) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let rows;
    try {
      const { data, error } = await client
        .from('drawings')
        .select('name, storage_path, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data;
    } catch (error) {
      console.error('Garabatos mosaic: failed to fetch drawings:', error);
      renderStatus(gridEl, statusEl, 'error');
      return;
    }

    if (rows.length === 0) {
      renderStatus(gridEl, statusEl, 'empty');
      return;
    }

    statusEl.textContent = '';

    const densityCache = new Map();
    const drawings = [];
    for (const row of rows) {
      if (!densityCache.has(row.storage_path)) {
        try {
          const img = await loadImage(downloadUrlFor(row.storage_path));
          densityCache.set(row.storage_path, Garabatos.mosaic.densityScore(img));
        } catch (error) {
          console.error('Garabatos mosaic: failed to score drawing:', error);
          densityCache.set(row.storage_path, 0.5);
        }
      }
      drawings.push({
        name: row.name,
        storage_path: row.storage_path,
        density: densityCache.get(row.storage_path),
      });
    }

    // TODO: swap this for your own target image, e.g.:
    // const targetImg = await loadImage('/gallery/garabatos-custom/target.png');
    // const mask = Garabatos.mosaic.buildMask(targetImg, COLS, ROWS);
    const mask = Garabatos.mosaic.buildMask('GARABATOS', COLS, ROWS);
    const tiles = Garabatos.mosaic.packTiles(mask, drawings);

    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    gridEl.style.aspectRatio = `${COLS} / ${ROWS}`;

    tiles.forEach((tile) => gridEl.appendChild(renderTile(tile)));
    window.__mosaicTileCount = tiles.length; // read by verification step only
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 3: Manual verification**

`browser_navigate` to `http://localhost:8000/gallery/garabatos-custom/index.html?cb=1`. Same checks as Task 3 Step 3 (`tileCount`/`gridChildren` match, tiles render, no console errors). This page is expected to look identical to `gallery/garabatos/` right now (same wordmark mask) — that's correct; the only difference is the marked TODO line, ready for the user to swap in a real target image later.

- [ ] **Step 4: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add gallery/garabatos-custom/index.html gallery/garabatos-custom/script.js
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add gallery/garabatos-custom/ stub for future custom-image mosaic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

---

### Task 6: Sitemap entry + full end-to-end verification

**Files:**
- Modify: `sitemap.xml`

**Interfaces:** none.

- [ ] **Step 1: Add the sitemap entry**

Read the current `sitemap.xml`, then add a new `<url>` block for `gallery/garabatos/` (not for the redirect or the stub page — see spec's SEO section) immediately after the existing `gallery/pajaritos` entry:

```xml
    <url>
        <loc>https://mariocornejo.com/gallery/garabatos/</loc>
        <lastmod>2026-09-10</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>
```

- [ ] **Step 2: Full end-to-end Playwright pass**

With the local server still running:

1. Navigate to `http://localhost:8000/garabatos/gallery/index.html?cb=final1` → confirm redirect lands on `/gallery/garabatos/`.
2. Navigate to `http://localhost:8000/gallery/garabatos/index.html?cb=final2` at `1280x900` → confirm tiles render, wordmark is legible in the screenshot, no console errors.
3. Resize to `375x812`, re-navigate with `?cb=final3` → confirm same.
4. Navigate to `http://localhost:8000/gallery/garabatos-custom/index.html?cb=final4` → confirm it renders the same wordmark mosaic (TODO path not yet exercised, that's expected).
5. From `gallery/garabatos/index.html`, click the "Volver a Garabatos" / "Back to Garabatos" link (or navigate directly) and confirm it lands on `/garabatos/index.html`.
6. Confirm `sitemap.xml` is well-formed: `python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"` from the deploy repo root — expect no output (no exception raised).

- [ ] **Step 3: Stage and confirm before committing**

```bash
cd "/Users/hicor13/Website/hicor13.github.io/hicor13.github.io"
git add sitemap.xml
```

Confirm with the user before `git commit`. Suggested message:

```
feat: add gallery/garabatos/ to sitemap.xml

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019ab9uzgWZ4oPvuESWxtA4p
```

**This task completes the plan.** Do not push, do not copy to the source repo, and do not merge/promote anything — those are separate steps the user directs explicitly, per this repo's established norm (confirmed repeatedly this session: local verification and commits only, push/promote only on direct instruction).
