# Garabatos Mosaic Gallery — Design

## Goal

A new, full-screen "wall" page at `gallery/garabatos/` that arranges every
saved drawing from the Garabatos Supabase database into a photomosaic that
traces the word "GARABATOS" — an ambient, ever-growing community art piece,
not an interactive browser. A second stub page (`gallery/garabatos-custom/`)
reuses the same engine so a custom target image can be dropped in later.
`garabatos/gallery/` becomes a redirect to `gallery/garabatos/`, keeping the
site's existing convention — every gallery-type page lives under
`gallery/<name>/` (precedent: `gallery/pajaritos/`) — rather than nesting a
gallery under `garabatos/`.

## Why

The existing gallery grid on `garabatos/index.html` is a plain responsive
grid — functional but doesn't do anything with the fact that every drawing
starts as solid black (`canvas.js`'s blank fill, `#111111`) and gets
partially revealed by scratching. That "how much got scratched" signal is
free, meaningful data per drawing. This design turns it into the mosaic's
visual language: how much of each tile's black got filled with color
that drawing's `mix-blend-mode: lighten` composite, and how visually
prominent the tile is in the collage.

## Scope

**In scope:** `gallery/garabatos/` (wordmark mosaic, ships now),
`gallery/garabatos/mosaic-engine.js` (shared, reusable logic), stub
`gallery/garabatos-custom/` (plumbing only, no custom-image logic),
`garabatos/gallery/index.html` converted to a redirect stub.

**Out of scope:** the custom-image mosaic itself (user builds this later
on top of the stub), interactivity (click/drag/filter/zoom — ambient only
per user decision), replacing the existing small gallery grid on
`garabatos/index.html` (stays as-is, this is a separate page).

## Architecture

```
gallery/
  garabatos/
    index.html
    script.js              <- page glue: fetch drawings, call engine, render
    styles.css              <- grid/tile layout, blend effect
    mosaic-engine.js        <- shared: mask building, density scoring, tile packing
  garabatos-custom/
    index.html
    script.js               <- same engine (../garabatos/mosaic-engine.js), placeholder mask + TODO marker
garabatos/
  gallery/
    index.html               <- redirect only (meta refresh -> /gallery/garabatos/), same pattern as this repo's 404.html
```

`gallery/garabatos-custom/script.js` references the engine via a relative
path (`../garabatos/mosaic-engine.js`) rather than duplicating it — shared
within the mosaic feature, not promoted to a site-wide shared location,
since nothing outside these two pages uses it.

`mosaic-engine.js` exposes three functions on `window.Garabatos.mosaic`:

- `buildMask(source, cols, rows)` — `source` is either a string (rendered
  as bold text) or an `HTMLImageElement`. Draws it to an offscreen canvas
  sized `cols × rows` and returns a `boolean[rows][cols]` of which cells
  are "on" (ink present).
- `densityScore(imgEl)` — draws `imgEl` to a small (64×40) offscreen
  canvas, counts pixels whose color distance from `#111111` exceeds a
  threshold, returns `count / totalSampled` (0–1).
- `packTiles(mask, drawings)` — walks on-cells in reading order, assigns
  a shuffled cycle of `drawings`, re-shuffles locally to avoid the same
  drawing landing in two orthogonally-adjacent cells where the pool size
  allows it. Returns `{ col, row, drawing }[]`.

Both pages fetch their own drawing list (small, duplicated Supabase query
matching `gallery.js`'s shape) — not worth coupling to the existing
`gallery.js`, which mixes fetch with its own grid-rendering.

## Data Flow

1. Fetch all rows from `drawings` (`name, storage_path, created_at`), no
   `.limit(60)` cap — the mosaic wants the full set.
2. For each **unique** `storage_path`, load the image once, compute its
   density score via `densityScore()`, cache in a `Map` keyed by
   `storage_path` (repeats — expected, given the DB currently has far
   fewer drawings than mosaic cells — reuse the cached score).
3. `buildMask('GARABATOS', 48, 14)` — cell grid tuned so the wordmark
   reads clearly at common viewport widths (verify at 375px and 1280px
   during implementation; adjust `cols`/`rows` if it doesn't read at
   either).
4. `packTiles(mask, drawings)`.
5. Render one `<figure class="mosaic-tile">` per packed tile, positioned
   with CSS Grid (`grid-column`/`grid-row` matching its cell), with
   inline `style="--density: <score>"`.

## Tile Rendering — the black-fill effect

Each tile is two layers:

```html
<figure class="mosaic-tile" style="--density: 0.62">
  <div class="mosaic-noise"></div>
  <img src="..." alt="..." loading="lazy">
</figure>
```

- `.mosaic-noise` — a `@keyframes`-animated multi-stop gradient (pure CSS,
  compositor-accelerated, no per-tile JS/RAF loop). `--density` scales its
  animation-duration and opacity slightly (sparser drawings' tiles feel
  more restless).
- `img` — `mix-blend-mode: lighten`. Black background pixels (`0,0,0`)
  let the noise layer's color show through (lighten picks the brighter of
  the two per channel); the drawing's own bright scratched strokes stay
  dominant over the noise.
- `--density` also drives `transform: scale()` / `opacity` on the tile
  itself — denser (more-scratched) drawings render larger and more solid,
  sparser ones smaller and more translucent.
- `image-rendering: pixelated` carries over from the existing gallery card
  styling — must confirm during implementation that it doesn't fight the
  blend/noise layer visually (check at implementation time; if the
  combination looks muddy, `image-rendering: pixelated` may need to move
  to a wrapping element instead of the `img` itself).

## States

- **Empty DB (0 drawings):** centered bilingual message, same pattern as
  the existing small gallery's empty state (`garabatos-empty` styling,
  new copy: "Nothing to show yet" / "Sé el primero..." equivalents).
- **Fetch error:** bilingual "couldn't load" message, same pattern as
  `gallery.js`'s `renderError()`.
- **Fewer drawings than on-cells** (current: 16 drawings vs. ~150+ on-cells
  at 48×14): expected, not an error — this is inherent to photomosaics
  with a small source pool. Neighbor-avoidance in `packTiles` keeps
  repetition from reading as obviously copy-pasted.

## Redirect Stub (`garabatos/gallery/index.html`)

Replaces the current (empty/never-built) `garabatos/gallery/` with a
minimal meta-refresh redirect to `/gallery/garabatos/`, following this
repo's own `404.html` precedent (`<meta http-equiv="refresh" content="0;
URL=...">`). Exists so an old or guessed `garabatos/gallery/` link still
lands somewhere correct instead of 404ing, while the real page lives at
the site's established `gallery/<name>/` path.

## Stub Page (`gallery/garabatos-custom/`)

Same fetch + density-scoring flow as `gallery/garabatos/`, but
`buildMask()` is called with a placeholder source (reuse the "GARABATOS"
text mask) and a single clearly marked line:

```js
// TODO: swap this for your own target image, e.g.:
// const img = document.getElementById('target-image');
// Garabatos.mosaic.buildMask(img, cols, rows);
const mask = Garabatos.mosaic.buildMask('GARABATOS', 48, 14);
```

No image-matching/average-color logic beyond what `buildMask` already
does for text — the user builds their own target-image handling on top of
this later.

## Testing

No test framework in this repo — manual verification via local server +
Playwright, per project convention:

- Both pages load, tiles render, mosaic traces the wordmark shape
  recognizably at 375px and 1280px viewports.
- Density variance is visible (tile sizes/opacity differ across the wall).
- Noise/blend layer animates; check it doesn't clash with
  `image-rendering: pixelated`.
- Empty-DB and fetch-error states render correctly (fetch-error can be
  forced by temporarily pointing at an invalid Supabase key).
- Both pages link back to `/garabatos/` and include `<site-topbar>` /
  `<site-footer>` like the rest of the site.
- `garabatos/gallery/index.html` actually redirects to
  `/gallery/garabatos/` (navigate there directly, confirm landing page).
- No console errors.

## SEO

`gallery/garabatos/index.html` gets the same meta treatment as
`gallery/pajaritos/index.html` (title, description, canonical, basic OG
tags) and a new entry in the root `sitemap.xml`, matching the existing
`garabatos/index.html` and `gallery/pajaritos/index.html` entries.
`garabatos/gallery/index.html` (the redirect) and `gallery/garabatos-custom/`
(the stub) are not added to the sitemap — one is a pure redirect, the
other has no finished content yet.
