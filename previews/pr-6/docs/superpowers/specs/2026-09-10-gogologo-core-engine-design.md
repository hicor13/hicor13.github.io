# Gogologo — Core Engine & Controls (Sub-project 1) — Design

## Context

Gogologo is a Galaga-style arcade shooter planned for `mariocornejo.com/gogologo/`,
never previously built (conceived only in an earlier conversation, no code
exists anywhere). Full scope, agreed with the user: Peruvian/16-bit visual
theme, an SSB-style character-select screen where the player picks which
Garabatos drawing becomes their ship, enemies drawn from the same Garabatos
database, classic Galaga formation-flying + dive-attack AI + escalating
levels (no tractor-beam capture mechanic), two distinct control schemes
(keyboard on PC, touch on mobile).

That full scope is too large for one spec, so it's decomposed into
sub-projects, each with its own spec → plan → build cycle:

1. **Core engine & controls** (this spec) — playable loop: movement,
   shooting, collision, score/lives/game-over, both control schemes, real
   Garabatos drawings (with black-to-transparent conversion) as player and
   enemy sprites via simple placeholder motion (no formations/AI yet).
2. Character select (SSB-style) — pick which drawing becomes the player's
   ship, replacing sub-project 1's arbitrary pick-from-pool default.
3. Enemy formations & attack AI — entrance choreography, dive-bomb
   patterns, escalating levels.
4. Deeper "black portions as gameplay" mechanic — whatever gameplay effect
   (if any) scratch-density should have beyond the sprite's basic
   transparency, explicitly undecided until this cycle.

This spec covers **only sub-project 1**.

## Goal

A playable, single-continuous-wave arcade shooter: player ship at the
bottom of the screen, moves left/right, shoots upward; simple enemies
descend from the top; colliding a shot with an enemy scores and destroys
it; an enemy reaching the bottom or hitting the player costs a life; 3
lives, then game over with a restart option. Both a keyboard scheme (PC)
and a touch scheme (mobile) drive the same underlying actions. Player and
enemy sprites are real Garabatos drawings fetched from Supabase, with
near-black pixels converted to transparent so each drawing reads as a
proper sprite silhouette rather than a black box — this conversion
pipeline is core, permanent infrastructure, not a placeholder, even though
this sub-project's enemy movement itself is a simple placeholder (no
formations/AI — that's sub-project 3).

## Why

Building the full Galaga scope in one shot is high-risk and hard to
review. This sub-project proves the whole vertical slice — rendering,
input, physics, real drawing-derived art with transparency, score/lives —
end to end, on a small enough surface to build and review well, before
formations/AI/character-select layer on top of a foundation that's already
known to work.

## Scope

**In scope:** Phaser 3 + TypeScript + Vite source (dev-only, own directory,
not served); built static output deployed to `/gogologo/`; Boot/Preload/
Menu/Game/GameOver scenes; player movement + single-shot firing with
cooldown; simple placeholder enemy spawn-and-descend (no formations, no
attack patterns); Arcade Physics collision; score + 3 lives + game-over +
restart; localStorage best-score persistence; keyboard input; touch input
(drag-to-move + tap-to-fire button); the Garabatos-drawings-as-sprites
fetch + black-to-transparent conversion pipeline, used for both the
player's ship (one drawing from the fetched pool, arbitrary pick) and
enemies (cycling through the rest of the pool).

**Out of scope:** character select UI (sub-project 2 — sub-project 1 just
picks a drawing from the pool with no player choice involved); formation
flight, dive-bomb attack patterns, discrete escalating levels (sub-project
3); any gameplay effect tied to *how much* of a drawing was scratched —
size, health, behavior, etc. (deferred, sub-project 4); tractor-beam
capture (out of scope entirely, per user decision); any backend/score
leaderboard (localStorage only).

## Architecture

```
gogologo-src/                  <- dev-only Phaser/Vite source, NOT served
  package.json
  vite.config.ts                 (build.outDir: ../gogologo)
  tsconfig.json
  .gitignore                     (node_modules/, dist local preview only)
  src/
    main.ts                      <- Phaser.Game bootstrap, scene list
    config/
      game-config.ts             <- Phaser.Types.Core.GameConfig
      constants.ts                <- SUPABASE_URL/KEY, gameplay tuning values
    scenes/
      boot-scene.ts
      preload-scene.ts            <- fetches + converts drawings, then -> Menu
      menu-scene.ts
      game-scene.ts                <- gameplay, HUD text drawn directly here
      game-over-scene.ts
    entities/
      player.ts                   <- movement, firing, cooldown
      enemy.ts                    <- spawn, descend, destroy-on-hit
    systems/
      garabatos-sprites.ts        <- fetch + black-to-transparent + texture registration
      input-system.ts             <- keyboard + touch, exposes moveToX()/fire() actions
      save-manager.ts             <- localStorage best-score get/set
    utils/
      black-to-transparent.ts     <- pure canvas function, no Phaser dependency

gogologo/                      <- DEPLOYED static output (built, committed)
  index.html
  assets/...                     (Vite-hashed JS/CSS bundle)
```

`gogologo-src/` and `gogologo/` are siblings at the repo root. Building
(`npm run build` inside `gogologo-src/`) writes straight into `../gogologo`
via Vite's configured `outDir` — no separate copy step. This repo has no
CI/build pipeline (every other page is committed as plain static files, no
build step at all), so building and committing `gogologo/`'s output is a
manual step after every source change; the implementation plan calls this
out explicitly as its own step so it's never silently skipped.

## Sprite Pipeline (`black-to-transparent.ts` + `garabatos-sprites.ts`)

`black-to-transparent.ts` exports a pure function:

```ts
function applyBlackTransparency(
  image: HTMLImageElement,
  threshold: number = 40
): HTMLCanvasElement
```

Draws `image` to an offscreen canvas, and for every pixel whose color
distance from `#111111` (the same blank-canvas fill color as
`canvas.js`'s `paint()`, matching `mosaic-engine.js`'s `densityScore()`
threshold logic exactly) is below `threshold`, sets that pixel's alpha to
0. Returns the resulting canvas. No Phaser dependency — independently
testable with any loaded image.

`garabatos-sprites.ts` exports:

```ts
async function fetchDrawingPool(count: number): Promise<DrawingRef[]>
// DrawingRef = { name: string; storagePath: string; url: string }

async function loadTransparentTexture(
  scene: Phaser.Scene,
  key: string,
  url: string
): Promise<boolean>
// Loads the image, runs applyBlackTransparency, registers the result as
// a Phaser texture via scene.textures.addCanvas(key, canvas). Returns
// false (does not throw) on any failure — caller falls back to a
// generated placeholder texture.
```

`fetchDrawingPool` queries the same `drawings` table/Supabase
project/anon key as every other Garabatos page in this repo, ordered
newest-first, cycling/repeating if the DB has fewer than `count` rows
(same tolerant-of-a-small-pool approach as the mosaic gallery).

## Preload & Scene Flow

`PreloadScene`:
1. Load the handful of built-in assets (none beyond what Phaser needs
   internally — no external art files for this sub-project).
2. Call `fetchDrawingPool(12)` (12 chosen as enough for one player texture
   + a handful of concurrently-visible placeholder enemies with some
   variety; not a hard limit elsewhere in the code).
3. For each drawing, call `loadTransparentTexture`. If it returns `false`
   for a given drawing, skip it (use whatever succeeded). If it fails for
   **all** drawings (Supabase down, empty DB), generate one placeholder
   texture via Phaser's `Graphics.generateTexture()` (simple colored
   shape, Peruvian palette) so the game is always playable — matches the
   defensive "never show a silent blank/broken page" pattern already
   established for every other Garabatos-family page.
4. Store the resulting texture keys in the scene registry (`this.registry`)
   so `MenuScene`/`GameScene` can read them without re-fetching.
5. Transition to `MenuScene`.

`MenuScene`: title text, "Start" prompt (tap/click or Enter/Space),
transitions to `GameScene`.

`GameScene`: reads texture keys from the registry, assigns the first to
the player, cycles the rest for enemies as they spawn. Runs gameplay (see
below). On life-loss-to-zero, transitions to `GameOverScene` carrying the
final score.

`GameOverScene`: shows final score + best score (from `save-manager.ts`,
updating it first if the new score is higher), "Restart" prompt returns to
`GameScene` (re-reading the same already-loaded textures from the
registry — no re-fetch needed for a replay).

## Gameplay (`GameScene`, `player.ts`, `enemy.ts`)

- **Player:** fixed y-position near the bottom, x-position driven by
  whichever input system is active (keyboard or touch — see below).
  Firing spawns a projectile sprite moving upward at a constant speed;
  cooldown (e.g. 350ms, tune during build) prevents holding-fire from
  spamming shots.
- **Enemies:** spawn at a random x at the top on a timer (e.g. every
  800ms-1200ms, tune during build), move straight down at a constant
  speed, textured from the cycled drawing pool. No formation, no attack
  diving — that's sub-project 3's entire job.
- **Collision (Arcade Physics):** projectile-vs-enemy destroys both,
  increments score. Enemy-vs-player-ship or enemy reaching the bottom
  edge costs one life and destroys that enemy. At 0 lives, go to
  `GameOverScene`.

## Controls (`input-system.ts`)

Exposes two actions to `GameScene`, regardless of input source:
`moveToX(x: number)` and `fire()`. Two concrete handlers implement these:

- **Keyboard:** Arrow keys / A-D adjust a target x incrementally (held-key
  = continuous movement, standard Phaser keyboard polling in `update()`);
  Space calls `fire()` (subject to the same cooldown as above).
- **Touch:** a full-width invisible drag zone covering the main play area
  (excluding the fire button's corner) maps touch/drag x-position directly
  to `moveToX()`; a fixed, semi-transparent circular button in the
  bottom-right corner calls `fire()` on tap. Detected via
  `('ontouchstart' in window)` at scene start, not user-agent sniffing —
  both handlers can coexist (e.g. a touchscreen laptop with a keyboard
  works either way).

`GameScene`'s own logic never branches on input type — it only ever calls
the two actions, wired to whichever handler(s) are active.

## Score, Lives, Persistence (`save-manager.ts`)

- In-memory score (+= per enemy destroyed) and lives (starts at 3, -=1 per
  hit/leak) live in `GameScene`, drawn as plain Phaser text objects (no
  separate `UIScene` — not warranted until something needs to pause
  independently of the HUD, which nothing does yet).
- `save-manager.ts` wraps `localStorage` get/set for a single best-score
  number, with try/catch guarding every read/write (private browsing,
  storage quota — same defensive pattern as `garabatos/script.js`'s
  existing throttle helpers) so a storage failure never blocks gameplay,
  it just fails to persist.

## Testing

No test framework in the Phaser/Vite source — a first playable prototype
doesn't yet warrant one (would reconsider once formations/AI in
sub-project 3 add real logic worth unit-testing). Verification is manual:

- `npm run dev` inside `gogologo-src/`, drive the dev server with
  Playwright: movement (keyboard emulation), firing + cooldown, collision
  → score increments, life loss on enemy leak/hit, game-over at 0 lives,
  restart returns to a fresh `GameScene`.
- Confirm real Garabatos drawings render as sprites with visible
  transparency (not black boxes) for both the player ship and enemies.
- Emulate touch input (Playwright's touch/tap emulation) to verify the
  drag-to-move and fire-button handlers work independently of the
  keyboard path.
- Force the Supabase fetch to fail (temporarily point at an invalid
  key/URL) and confirm the placeholder-texture fallback keeps the game
  playable rather than breaking.
- `npm run build`, then serve the repo root the same way this site's
  other pages are verified (`python3 -m http.server`) and load
  `/gogologo/` as a plain static page — confirms the built output actually
  works outside the Vite dev server, which is the only way it will ever
  be served in production.
