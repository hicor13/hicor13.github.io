# Garabatos Scratch-Art Board + Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this project — see "Why inline execution" below) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new `/garabatos/` page where any visitor scratches a black-coated canvas to reveal a rainbow gradient underneath, then saves the drawing to a public gallery visible to every visitor.

**Architecture:** A self-contained static subpage (`garabatos/index.html` + 4 small JS/CSS files), reusing the main site's design tokens and `<site-topbar>`/`<site-footer>` chrome. Canvas mechanic is pure client-side (no backend). Persistence is Firebase Firestore (metadata) + Storage (PNG files), loaded via dynamic `import()` of the modular SDK — no build step, matching this repo's existing PDF.js precedent in `script.js`.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas 2D API, Firebase JS SDK v10 (Firestore + Storage) via CDN dynamic import, no npm/bundler.

**Spec:** `docs/superpowers/specs/2026-09-09-garabatos-scratchboard-design.md`

## Why inline execution, not subagent-driven-development

This site has an established, strong norm (carried across many prior sessions on this repo): **never `git commit` or push without the user explicitly typing "commit"/"push."** Work accumulates uncommitted across many edits, gets visually verified via a local server + Playwright, and is committed once in a single batch only when told to. `subagent-driven-development`'s per-task review loop assumes a commit after every task (for diffing/review packages) — that assumption doesn't hold here. Use `executing-plans` (or just work through the tasks directly in this session) instead: implement, verify with Playwright, move to the next task, and only run `git add`/`git commit` at the very end, and only if the user has said to.

## Global Constraints

- **No commits without explicit instruction.** Do not run `git commit` (or `git push`) for any task below unless the user has explicitly said "commit" or "push" in this session. Work stays uncommitted in the working tree across all 7 tasks.
- **Two-repo sync.** Every file created/modified below must be created/modified identically in both repos: the source repo (`~/Library/CloudStorage/OneDrive-Personal/Documentos/Proyectos/Resume-Site`, no remote) and the deploy repo (`~/Website/hicor13.github.io/hicor13.github.io`, remote `github-hicor13-pages`). Edit in one, then `cp` to the other — don't hand-edit both separately (drift risk).
- **Never touch** `/gallery/pajaritos/` or stage any pre-existing unrelated modified file (check `git status` before ever running `git add`).
- No build tooling, no npm, no bundler. Firebase JS SDK loaded via `import()` inside a plain (non-module) `<script>`, matching the existing PDF.js dynamic-import pattern in `script.js`'s `initResumeModal`.
- Root-relative paths for shared assets (`/libs/personal/site-chrome.js`, `/styles.css`), matching existing site convention.
- Cache-bust query strings (`?v=YYYYMMDDx`) on new `<script>`/`<link>` tags. Today's date is 2026-09-09; garabatos's own new files start their own suffix sequence at `a` (`?v=20260909a`). The shared `/libs/personal/site-chrome.js` reference uses the CURRENT latest suffix already in `index.html` (`?v=20260909h` — check `index.html`'s own `<script src="/libs/personal/site-chrome.js?v=...">` line before writing Task 1's HTML, in case it has moved past `h` since this plan was written).
- Firebase config values (`apiKey`, `authDomain`, etc.) go directly into `garabatos/script.js` as a plain object literal — safe and expected per Firebase's own design; access is gated by the security rules (Task 3), not by hiding these values.
- Verify every task locally: `python3 -m http.server 8743` from each repo root, then Playwright (fresh browser context per check, per this session's established testing pattern) against `http://localhost:8743/garabatos/index.html`.

---

### Task 1: Page scaffold + shared chrome

**Files:**
- Create: `garabatos/index.html`
- Create: `garabatos/styles.css`

**Interfaces:**
- Produces: DOM element IDs later tasks depend on — `#scratch-canvas`, `#brush-size`, `#clear-btn`, `#artist-name`, `#save-btn`, `#save-status`, `#gallery-grid`. Task 2 attaches behavior to `#scratch-canvas`/`#brush-size`/`#clear-btn`. Tasks 4-5 attach behavior to `#gallery-grid`/`#save-btn`/`#artist-name`/`#save-status`.

- [ ] **Step 1: Check the current site-chrome cache-bust suffix**

Run (from either repo root): `grep -n "site-chrome.js?v=" index.html`

Use whatever suffix that prints (e.g. `20260909h`) in Step 2's `<script>` tag — do not assume it's still `h`.

- [ ] **Step 2: Create `garabatos/index.html`**

```html
<!DOCTYPE html>
<html lang="es-PE" data-lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Garabatos — Mario Cornejo</title>
  <meta name="description" content="Raspa y dibuja: deja un garabato en la galería pública de mariocornejo.com.">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="stylesheet" href="/styles.css?v=20260909i">
  <link rel="stylesheet" href="/garabatos/styles.css?v=20260909a">
  <script src="/libs/personal/site-chrome.js?v=20260909h"></script>
</head>
<body>
  <header class="garabatos-header">
    <site-topbar></site-topbar>
    <h1><span data-i18n-es>Garabatos</span><span data-i18n-en>Doodles</span></h1>
    <p class="garabatos-intro">
      <span data-i18n-es>Raspa la superficie negra para revelar el color de abajo. Dibuja algo y déjalo en la galería.</span>
      <span data-i18n-en>Scratch the black surface to reveal the color underneath. Draw something and leave it in the gallery.</span>
    </p>
  </header>

  <main>
    <section class="garabatos-board" aria-label="Tablero de raspado">
      <canvas id="scratch-canvas" width="640" height="400"></canvas>
      <div class="garabatos-controls">
        <label for="brush-size">
          <span data-i18n-es>Grosor</span><span data-i18n-en>Brush size</span>
        </label>
        <input type="range" id="brush-size" min="4" max="40" value="16">
        <button type="button" id="clear-btn">
          <span data-i18n-es>Borrar</span><span data-i18n-en>Clear</span>
        </button>
        <input type="text" id="artist-name" maxlength="40" placeholder="Tu nombre / Your name">
        <button type="button" id="save-btn" class="garabatos-save">
          <span data-i18n-es>Guardar</span><span data-i18n-en>Save</span>
        </button>
      </div>
      <p id="save-status" class="garabatos-status" role="status" aria-live="polite"></p>
    </section>

    <section class="garabatos-gallery" aria-label="Galería">
      <h2><span data-i18n-es>Galería</span><span data-i18n-en>Gallery</span></h2>
      <div id="gallery-grid" class="garabatos-grid"></div>
    </section>
  </main>

  <site-footer base="/index.html"></site-footer>

  <script src="/garabatos/canvas.js?v=20260909a"></script>
  <script src="/garabatos/gallery.js?v=20260909a"></script>
  <script src="/garabatos/script.js?v=20260909a"></script>
</body>
</html>
```

Note: the three `<script>` tags at the bottom reference files Tasks 2-5 create. Loading them now (empty/nonexistent) is fine — Step 4 of this task only checks the header, intro, and empty controls render; console 404s on the not-yet-created JS files are expected until Task 2.

- [ ] **Step 3: Create `garabatos/styles.css`**

```css
/* garabatos/styles.css
   Page-specific rules only — tokens (--bg/--fg/--muted/--pill-*) and the
   nav-pill/site-topbar/site-footer chrome come from /styles.css, loaded
   before this file. Garabatos follows the site's real light/dark toggle
   (unlike gallery/pajaritos, which is deliberately fixed-dark) since a
   scratch-art board has no reason to ignore the site theme. */

body {
  background: var(--bg, #f7f6f3);
  color: var(--fg, #1a1a1a);
  margin: 0;
}

.garabatos-header {
  position: relative;
  padding: 6rem 1.5rem 2rem;
  text-align: center;
}

.garabatos-header h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
}

.garabatos-intro {
  max-width: 32rem;
  margin: 0 auto;
  color: var(--muted, #6b6b6b);
}

.garabatos-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 0 1.5rem 3rem;
}

#scratch-canvas {
  width: 100%;
  max-width: 40rem;
  aspect-ratio: 640 / 400;
  touch-action: none;
  cursor: crosshair;
  border-radius: 12px;
  border: 1px solid var(--pill-border, #d8d6d1);
}

.garabatos-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  max-width: 40rem;
  width: 100%;
}

.garabatos-controls label {
  font-size: 0.85rem;
  color: var(--muted, #6b6b6b);
}

#artist-name {
  flex: 1 1 12rem;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--pill-border, #d8d6d1);
  background: var(--pill-bg, rgba(255, 255, 255, 0.55));
  color: var(--fg, #1a1a1a);
  font: inherit;
}

.garabatos-controls button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--pill-border, #d8d6d1);
  background: var(--pill-bg, rgba(255, 255, 255, 0.55));
  color: var(--fg, #1a1a1a);
  font: inherit;
  cursor: pointer;
}

.garabatos-save {
  background: var(--accent, #1a1a1a);
  color: var(--accent-fg, #ffffff);
  border-color: transparent;
}

.garabatos-status {
  min-height: 1.2em;
  font-size: 0.9rem;
  color: var(--muted, #6b6b6b);
}

.garabatos-gallery {
  padding: 0 1.5rem 4rem;
  max-width: 60rem;
  margin: 0 auto;
}

.garabatos-gallery h2 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.garabatos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 1rem;
}

.garabato-card {
  margin: 0;
  background: var(--pill-bg, rgba(255, 255, 255, 0.55));
  border: 1px solid var(--pill-border, #d8d6d1);
  border-radius: 10px;
  overflow: hidden;
}

.garabato-card img {
  display: block;
  width: 100%;
  aspect-ratio: 640 / 400;
  object-fit: cover;
}

.garabato-card figcaption {
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  color: var(--muted, #6b6b6b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.garabatos-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--muted, #6b6b6b);
}

@media (max-width: 40rem) {
  .garabatos-header {
    padding-top: 8rem;
  }
}
```

- [ ] **Step 4: Copy both files to the other repo**

```bash
cp garabatos/index.html garabatos/styles.css "<other-repo-root>/garabatos/"
```

(Create the `garabatos/` directory in the other repo first if it doesn't exist — `mkdir -p`.)

- [ ] **Step 5: Verify locally**

From the repo root: `python3 -m http.server 8743`, then open `http://localhost:8743/garabatos/index.html` in a fresh Playwright browser context. Confirm: page loads with no fatal console errors other than 404s for `canvas.js`/`gallery.js`/`script.js` (expected — not created yet), `<site-topbar>` renders (domain link, theme/lang toggle buttons visible), heading and intro text show in Spanish, theme toggle flips light/dark and visibly changes the page background, `<site-footer>` renders at the bottom.

Do not commit (see Global Constraints).

---

### Task 2: Scratch canvas mechanic

**Files:**
- Create: `garabatos/canvas.js`

**Interfaces:**
- Consumes: `#scratch-canvas` (a `<canvas width="640" height="400">`), `#brush-size` (a `<input type="range">`) — both from Task 1.
- Produces: `window.Garabatos.initCanvas(canvasEl, brushInput)` → `{ clear: () => void, exportPNG: () => Promise<Blob> }`. Task 5's `script.js` calls `Garabatos.initCanvas(...)` once on load, wires `clear` to the Clear button, and calls `exportPNG()` inside the Save handler.

- [ ] **Step 1: Create `garabatos/canvas.js`**

```js
// garabatos/canvas.js
//
// Pure scratch-art canvas mechanic — no Firebase, no page wiring. Exposed
// via window.Garabatos so script.js can orchestrate it without a build
// step / ES module graph (this repo has neither).
window.Garabatos = window.Garabatos || {};

Garabatos.initCanvas = function initCanvas(canvasEl, brushInput) {
  const ctx = canvasEl.getContext('2d');
  const CSS_WIDTH = 640;
  const CSS_HEIGHT = 400;

  function paint() {
    // Fixed internal resolution scaled by devicePixelRatio for sharpness;
    // setTransform lets every draw call below use plain 0..640/0..400
    // coordinates regardless of the actual pixel buffer size.
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = CSS_WIDTH * dpr;
    canvasEl.height = CSS_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createLinearGradient(0, 0, CSS_WIDTH, 0);
    gradient.addColorStop(0, '#ff3b30');
    gradient.addColorStop(0.17, '#ff9500');
    gradient.addColorStop(0.34, '#ffcc00');
    gradient.addColorStop(0.5, '#34c759');
    gradient.addColorStop(0.67, '#0a84ff');
    gradient.addColorStop(0.84, '#5856d6');
    gradient.addColorStop(1, '#af52de');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  }

  function canvasPoint(event) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (CSS_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (CSS_HEIGHT / rect.height),
    };
  }

  let scratching = false;
  let lastPoint = null;

  function scratchTo(point) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Number(brushInput.value) || 16;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
  }

  canvasEl.addEventListener('pointerdown', (event) => {
    scratching = true;
    lastPoint = canvasPoint(event);
    scratchTo(lastPoint); // draws a dot for a tap with no drag
    canvasEl.setPointerCapture(event.pointerId);
  });

  canvasEl.addEventListener('pointermove', (event) => {
    if (!scratching) return;
    scratchTo(canvasPoint(event));
  });

  const endScratch = () => {
    scratching = false;
    lastPoint = null;
  };
  canvasEl.addEventListener('pointerup', endScratch);
  canvasEl.addEventListener('pointercancel', endScratch);

  paint();

  return {
    clear: paint,
    exportPNG: () =>
      new Promise((resolve, reject) => {
        canvasEl.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      }),
  };
};
```

- [ ] **Step 2: Temporarily wire it up to verify (throwaway, removed in Task 5)**

Append to the bottom of `garabatos/index.html` (before the `canvas.js` line closes out), add a temporary inline script AFTER the `canvas.js` `<script>` tag to smoke-test it standalone:

```html
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const painter = Garabatos.initCanvas(
      document.getElementById('scratch-canvas'),
      document.getElementById('brush-size')
    );
    document.getElementById('clear-btn').addEventListener('click', painter.clear);
  });
</script>
```

- [ ] **Step 3: Verify in a fresh Playwright browser context**

Navigate to `http://localhost:8743/garabatos/index.html`. Simulate a scratch: dispatch `pointerdown` at canvas-relative (100, 100), `pointermove` to (300, 100), `pointerup`. Read back a pixel in the scratched path via `ctx.getImageData(100, 100, 1, 1).data` — expect alpha (`data[3]`) to be `0` (fully erased, revealing transparent-through-to-gradient... actually the canvas itself has no separate layer, so "revealed" means the wax fillRect at that pixel was erased via destination-out, so the pixel now shows whatever was painted before the wax — the gradient. Expect the pixel's RGB to match the gradient at that x-position, not `#111111`, and alpha to be `255` (opaque gradient color, not the erased-to-transparent value, since destination-out only removes what's drawn `after` it — here it correctly removes the wax layer that was drawn last, revealing the opaque gradient beneath, which was drawn first with `source-over` and is unaffected by later `destination-out` strokes below it in Z-order... this needs runtime confirmation, see below).
- Check an unscratched pixel, e.g. (500, 350): expect RGB ≈ `(17, 17, 17)` (`#111111`, still wax-covered).
- Click Clear, re-check (100, 100): expect RGB back to `(17, 17, 17)` (wax restored).
- Move the brush-size slider to `40`, scratch again, confirm the erased stroke is visibly wider than at `16` (compare erased pixel-run length along a horizontal scan line).

If the scratched pixel's alpha comes back `0` instead of showing the gradient color, that means `destination-out` erased through to full transparency instead of stopping at the gradient layer — re-check that the gradient `fillRect` (Step 1's `source-over` block) runs BEFORE the wax `fillRect` on every `paint()` call, and that `destination-out` is only ever applied during scratching (`scratchTo`), never during `paint()`. Both should already be true in the Step 1 code above; if this fails, the bug is almost certainly a `globalCompositeOperation` left set to `destination-out` from a previous scratch bleeding into the next `paint()` call — `paint()` explicitly resets it to `source-over` before filling, so verify that line is present and runs first.

- [ ] **Step 4: Remove the temporary Step 2 script**

Delete the inline `<script>` block added in Step 2 — Task 5 replaces it with the real `script.js` orchestration.

- [ ] **Step 5: Copy `canvas.js` and the updated `index.html` (Step 4's removal) to the other repo**

```bash
cp garabatos/canvas.js garabatos/index.html "<other-repo-root>/garabatos/"
```

Do not commit.

---

### Task 3: Firebase project + security rules (user-performed)

**Files:** none (external service configuration; no repo files change in this task).

**Interfaces:**
- Produces: a Firebase web-app config object `{ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }` that Task 4 hardcodes into `garabatos/script.js`, and a live Firestore + Storage instance with the rules below already active. Task 4 cannot be verified end-to-end until this task is done.

- [ ] **Step 1: Create the Firebase project**

Ask the user to go to `console.firebase.google.com`, click "Add project," name it (e.g. `mariocornejo-garabatos`), decline Google Analytics (not needed), and finish creation. Free "Spark" plan, no billing/card required.

- [ ] **Step 2: Enable Firestore**

In the new project's console: Build → Firestore Database → Create database → **production mode** (not test mode — production mode starts deny-all, which the rules below then open up deliberately and narrowly; test mode starts allow-all-for-30-days, which is not what we want) → pick any nearby region (e.g. `us-central1` if unsure).

- [ ] **Step 3: Enable Storage**

Build → Storage → Get started → production mode → same region as Firestore.

- [ ] **Step 4: Paste the Firestore rules**

Firestore Database → Rules tab → replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drawings/{drawingId} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['name', 'storagePath', 'createdAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() <= 40 &&
        request.resource.data.storagePath is string &&
        request.resource.data.storagePath == 'drawings/' + drawingId + '.png' &&
        request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

Click Publish.

- [ ] **Step 5: Paste the Storage rules**

Storage → Rules tab → replace the default with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /drawings/{fileName} {
      allow read: if true;
      allow create: if
        request.resource.size < 2 * 1024 * 1024 &&
        request.resource.contentType == 'image/png' &&
        fileName.matches('^[a-zA-Z0-9_-]+[.]png$');
      allow update, delete: if false;
    }
  }
}
```

Click Publish.

- [ ] **Step 6: Register a web app and get the config**

Project Overview (gear icon → Project settings, or the `</>` "Add app" icon on the overview page) → Add app → Web → give it any nickname → Firebase hosting: skip → copy the `firebaseConfig` object shown (has `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

- [ ] **Step 7: Hand the config to the assistant**

Paste the six-field config object into the conversation. **STOP here and wait for it if not yet provided — do not fabricate placeholder values in Task 4's code.** Task 4 hardcodes these exact values into `garabatos/script.js`.

---

### Task 4: Firebase gallery init — fetch and render

**Files:**
- Create: `garabatos/gallery.js`
- Modify: `garabatos/index.html` (add the `<script>` tag was already added in Task 1 — no change needed here unless Task 1's tag list is missing; verify it's present)

**Interfaces:**
- Consumes: Task 3's Firebase config object; `#gallery-grid` (from Task 1).
- Produces: `window.Garabatos.gallery.init(config, gridElement): Promise<void>` — fetches the latest 60 `drawings` docs and renders them into `gridElement`, or shows the bilingual empty-state message if there are none. `window.Garabatos.gallery.save(blob, name): Promise<{name, storagePath}>` — used by Task 5; not called by this task's own verification (Task 4 only exercises `init`).

- [ ] **Step 1: Create `garabatos/gallery.js`**

```js
// garabatos/gallery.js
//
// Firebase glue: Firestore for drawing metadata, Storage for the PNGs.
// Loaded as a plain (non-module) script; Firebase's modular SDK is
// ESM-only, so it's pulled in via dynamic import() — same pattern already
// used for PDF.js in the main site's script.js (initResumeModal).
window.Garabatos = window.Garabatos || {};

Garabatos.gallery = (function () {
  const SDK_VERSION = '10.14.1';
  const BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

  let db, storage, storageBucket, gridEl, firestoreApi, storageApi;

  function downloadUrlFor(storagePath) {
    return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  function renderCard(drawing) {
    const figure = document.createElement('figure');
    figure.className = 'garabato-card';
    const img = document.createElement('img');
    img.src = downloadUrlFor(drawing.storagePath);
    img.alt = drawing.name;
    img.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = drawing.name;
    figure.appendChild(img);
    figure.appendChild(caption);
    return figure;
  }

  function prepend(drawing) {
    gridEl.prepend(renderCard(drawing));
    const empty = gridEl.querySelector('.garabatos-empty');
    if (empty) empty.remove();
  }

  async function init(config, gridElement) {
    gridEl = gridElement;
    storageBucket = config.storageBucket;

    const [{ initializeApp }, firestore, storageMod] = await Promise.all([
      import(`${BASE}/firebase-app.js`),
      import(`${BASE}/firebase-firestore.js`),
      import(`${BASE}/firebase-storage.js`),
    ]);
    firestoreApi = firestore;
    storageApi = storageMod;

    const app = initializeApp(config);
    db = firestore.getFirestore(app);
    storage = storageMod.getStorage(app);

    const q = firestore.query(
      firestore.collection(db, 'drawings'),
      firestore.orderBy('createdAt', 'desc'),
      firestore.limit(60)
    );
    const snapshot = await firestore.getDocs(q);

    if (snapshot.empty) {
      const empty = document.createElement('p');
      empty.className = 'garabatos-empty';
      empty.innerHTML =
        '<span data-i18n-es>Sé el primero en dejar un garabato</span>' +
        '<span data-i18n-en>Be the first to leave a doodle</span>';
      gridEl.appendChild(empty);
      return;
    }

    snapshot.forEach((docSnap) => {
      gridEl.appendChild(renderCard(docSnap.data()));
    });
  }

  async function save(blob, name) {
    const id = crypto.randomUUID();
    const storagePath = `drawings/${id}.png`;
    const fileRef = storageApi.ref(storage, storagePath);
    await storageApi.uploadBytes(fileRef, blob, { contentType: 'image/png' });

    const drawing = {
      name,
      storagePath,
      createdAt: firestoreApi.serverTimestamp(),
    };
    await firestoreApi.setDoc(firestoreApi.doc(db, 'drawings', id), drawing);

    prepend({ name, storagePath });
    return drawing;
  }

  return { init, save };
})();
```

- [ ] **Step 2: Temporarily wire it up to verify (throwaway, removed in Task 5)**

Add a temporary inline script at the bottom of `garabatos/index.html`, after `gallery.js`'s `<script>` tag, using Task 3's real config:

```html
<script>
  document.addEventListener('DOMContentLoaded', () => {
    Garabatos.gallery.init(
      {
        apiKey: 'PASTE_FROM_TASK_3',
        authDomain: 'PASTE_FROM_TASK_3',
        projectId: 'PASTE_FROM_TASK_3',
        storageBucket: 'PASTE_FROM_TASK_3',
        messagingSenderId: 'PASTE_FROM_TASK_3',
        appId: 'PASTE_FROM_TASK_3',
      },
      document.getElementById('gallery-grid')
    ).catch((error) => console.error('gallery init failed:', error));
  });
</script>
```

- [ ] **Step 3: Verify in a fresh Playwright browser context**

Navigate to `http://localhost:8743/garabatos/index.html`. Confirm: no console errors (specifically no `permission-denied` — that would mean Task 3's Firestore rules weren't published correctly, or the `read: if true` line was mistyped); with a freshly created project (no drawings yet), the bilingual empty-state message appears inside `#gallery-grid` ("Sé el primero en dejar un garabato").

- [ ] **Step 4: Remove the temporary Step 2 script**

- [ ] **Step 5: Copy `gallery.js` and the updated `index.html` to the other repo**

```bash
cp garabatos/gallery.js garabatos/index.html "<other-repo-root>/garabatos/"
```

Do not commit.

---

### Task 5: Save flow + full orchestration

**Files:**
- Create: `garabatos/script.js`

**Interfaces:**
- Consumes: `Garabatos.initCanvas` (Task 2), `Garabatos.gallery.init`/`Garabatos.gallery.save` (Task 4), Task 3's Firebase config, and every DOM ID from Task 1.
- Produces: nothing further consumed by later tasks — this is the final wiring layer.

- [ ] **Step 1: Create `garabatos/script.js`**, using Task 3's real config values in place of the placeholders:

```js
// garabatos/script.js
//
// Orchestrates canvas.js (pure scratch mechanic) and gallery.js (Firebase
// glue) with the page's own DOM elements, button states, and bilingual
// status messages.

const FIREBASE_CONFIG = {
  apiKey: 'PASTE_FROM_TASK_3',
  authDomain: 'PASTE_FROM_TASK_3',
  projectId: 'PASTE_FROM_TASK_3',
  storageBucket: 'PASTE_FROM_TASK_3',
  messagingSenderId: 'PASTE_FROM_TASK_3',
  appId: 'PASTE_FROM_TASK_3',
};

const SAVE_THROTTLE_MS = 30000;
const THROTTLE_KEY = 'garabatos-last-save';

const MESSAGES = {
  es: {
    saved: '¡Guardado!',
    throttled: 'Espera un momento antes de guardar otro dibujo.',
    error: 'No se pudo guardar. Intenta de nuevo.',
  },
  en: {
    saved: 'Saved!',
    throttled: 'Wait a moment before saving another drawing.',
    error: "Couldn't save. Please try again.",
  },
};

function currentLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'es';
}

function defaultArtistName() {
  return currentLang() === 'en' ? 'Anonymous' : 'Anónimo';
}

function init() {
  const canvasEl = document.getElementById('scratch-canvas');
  const brushInput = document.getElementById('brush-size');
  const clearBtn = document.getElementById('clear-btn');
  const saveBtn = document.getElementById('save-btn');
  const nameInput = document.getElementById('artist-name');
  const statusEl = document.getElementById('save-status');
  const gridEl = document.getElementById('gallery-grid');
  if (!canvasEl || !gridEl) return;

  const painter = Garabatos.initCanvas(canvasEl, brushInput);

  clearBtn.addEventListener('click', () => {
    painter.clear();
    statusEl.textContent = '';
  });

  Garabatos.gallery.init(FIREBASE_CONFIG, gridEl).catch((error) => {
    console.error('Garabatos gallery failed to load:', error);
  });

  saveBtn.addEventListener('click', async () => {
    const msgs = MESSAGES[currentLang()];
    const lastSave = Number(localStorage.getItem(THROTTLE_KEY) || 0);
    if (Date.now() - lastSave < SAVE_THROTTLE_MS) {
      statusEl.textContent = msgs.throttled;
      return;
    }

    saveBtn.disabled = true;
    try {
      const blob = await painter.exportPNG();
      const name = nameInput.value.trim() || defaultArtistName();
      await Garabatos.gallery.save(blob, name);
      localStorage.setItem(THROTTLE_KEY, String(Date.now()));
      statusEl.textContent = msgs.saved;
      painter.clear();
      nameInput.value = '';
    } catch (error) {
      statusEl.textContent = msgs.error;
      console.error('Garabatos save failed:', error);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: Verify the full save flow in a fresh Playwright browser context**

Navigate to `http://localhost:8743/garabatos/index.html`. Simulate a scratch (as in Task 2 Step 3) so the exported PNG isn't just a blank black square. Type a name into `#artist-name`, click `#save-btn`. Confirm: `#save-status` shows "¡Guardado!"; the canvas visibly resets to solid black (auto-clear); a new `.garabato-card` appears at the top of `#gallery-grid` with the typed name as its caption and an `<img>` that actually loads (check `naturalWidth > 0` on that `img`, not just that `src` is set — a broken Storage rule or bad download-URL construction would leave `src` non-empty but the image failing to load).

- [ ] **Step 3: Verify the throttle**

Immediately click `#save-btn` again (within 30s of Step 2's save). Confirm `#save-status` shows the throttled message ("Espera un momento...") and no second Firestore doc/Storage file was created (re-run Task 4's fetch query, e.g. via the Firebase console's Firestore data viewer, and confirm the `drawings` collection has exactly one new document from this test session, not two).

- [ ] **Step 4: Verify the empty-name fallback**

Reload the page (bypasses the in-memory throttle only if `localStorage` is cleared — clear it via `localStorage.removeItem('garabatos-last-save')` in the Playwright context first), scratch something, leave `#artist-name` blank, save. Confirm the new gallery card's caption reads "Anónimo" (Spanish, the page's default `lang`).

- [ ] **Step 5: Manually delete the test drawings from Firebase**

Via the Firebase Console (Firestore data tab, and Storage's `drawings/` folder), delete the 1-2 test documents/files created in Steps 2-4 so the live gallery starts genuinely empty for real visitors.

- [ ] **Step 6: Copy `script.js` to the other repo**

```bash
cp garabatos/script.js "<other-repo-root>/garabatos/"
```

Do not commit.

---

### Task 6: Thumbnail + main-site integration

**Files:**
- Create: `garabatos/thumbnail.png`
- Modify: `index.html` (both repos) — add a project card in the `#projects` section's `.project-grid`

**Interfaces:** none consumed from earlier tasks beyond the now-working page itself (used to generate the thumbnail screenshot); none produced for later tasks (this is the last content task).

- [ ] **Step 1: Generate an illustrative thumbnail**

Using a fresh Playwright browser context, navigate to `http://localhost:8743/garabatos/index.html`. Simulate a handful of varied scratch strokes across `#scratch-canvas` (e.g. 4-5 short diagonal drags at different positions/brush sizes) so the thumbnail shows a genuine partial scratch pattern, not a blank black square or a single line. Screenshot just the `#scratch-canvas` element (not the full page) and save it as `garabatos/thumbnail.png`.

- [ ] **Step 2: Copy the thumbnail to the other repo**

```bash
cp garabatos/thumbnail.png "<other-repo-root>/garabatos/"
```

- [ ] **Step 3: Add the project card to `index.html`**

In the `#projects` section's `<div class="project-grid">`, after the existing "Automatización de reportería" `<article class="project-card reveal">` block, add:

```html
<article class="project-card reveal">
  <a href="/garabatos/index.html">
    <div class="ph-img project-thumb" role="img" aria-label="Placeholder de proyecto: Garabatos">
      <img class="pajaringo" role="img" src="/garabatos/thumbnail.png">
    </div>
    <h3><span data-i18n-es>Garabatos — Tablero de raspado</span><span data-i18n-en>Garabatos — Scratch Board</span></h3>
  </a>
  <p>
    <span data-i18n-es>Raspa una superficie negra para revelar color debajo y deja tu dibujo en una galería pública. Canvas 2D + Firebase, sin backend propio.</span>
    <span data-i18n-en>Scratch a black surface to reveal color underneath and leave your drawing in a public gallery. Canvas 2D + Firebase, no custom backend.</span>
  </p>
</article>
```

Make this exact edit in both repos' `index.html` (this file isn't `cp`-synced elsewhere in this plan since Tasks 1-5 never touched it — apply the same `<article>` insertion by hand in each).

- [ ] **Step 4: Verify**

Fresh Playwright context, navigate to `http://localhost:8743/index.html`, scroll to `#projects`. Confirm the new card renders with the thumbnail image, both-language title/description toggle correctly with the language switcher, and clicking the card navigates to `/garabatos/index.html`.

Do not commit.

---

### Task 7: End-to-end verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Re-run the spec's Testing checklist**

Fresh Playwright contexts against `http://localhost:8743/garabatos/index.html`, covering everything not already isolated in Tasks 1-6:
- Mobile viewport (375×667): controls wrap sensibly, canvas stays within viewport width, no horizontal scroll on the page body.
- Theme toggle: flips light/dark on `garabatos/index.html` the same way it does on `index.html` (unlike pajaritos, this page should visibly re-theme).
- Language toggle: flips every `data-i18n-es`/`data-i18n-en` pair on the page, including the gallery's empty-state message if the gallery happens to be empty at test time, and the save/throttle/error status messages (trigger each by re-running Task 5's Steps 2-4 with `document.documentElement.dataset.lang = 'en'` set first).
- No console errors on a clean load with an already-populated gallery (at least one real or test drawing present).

- [ ] **Step 2: Confirm two-repo parity**

```bash
diff -rq "<source-repo-root>/garabatos" "<deploy-repo-root>/garabatos"
diff "<source-repo-root>/index.html" "<deploy-repo-root>/index.html"
```

Expect no output (identical). If `index.html` differs anywhere beyond the Task 6 Step 3 card insertion, investigate before proceeding — it means the two repos drifted somewhere in Tasks 1-6.

- [ ] **Step 3: Report status to the user**

Summarize what was built and verified, and that nothing has been committed yet per the no-commit-without-instruction constraint — explicitly ask whether to commit/push now or leave it staged for later.

---

## Self-Review Notes

- **Spec coverage:** canvas mechanic (Task 2), Firebase init/fetch/render (Task 4), save flow + throttle (Task 5), security rules (Task 3), site integration (Task 6), bilingual copy (Tasks 1/5/6), theme support (Task 1's CSS token reuse, verified Task 7) — all spec sections have a task.
- **No-commit constraint:** added explicitly as a Global Constraint and repeated at the end of every task, overriding this skill's normal "commit every step" default — this repo's established norm takes precedence (see "Why inline execution" above).
- **Type/interface consistency checked:** `Garabatos.initCanvas` return shape (`{clear, exportPNG}`) matches its Task 5 call site; `Garabatos.gallery.init`/`.save` signatures match between Task 4's definition and Task 5's call sites; DOM IDs introduced in Task 1 match every later task's `getElementById` calls verbatim.
