# Gogologo — Character Select (Sub-project 2) — Design

## Context

Sub-project 1 (core engine & controls) is complete, reviewed, merged to
`main`, and live at `mariocornejo.com/gogologo/`. It picks the player's
ship arbitrarily — `GameScene` reads `drawingTextureKeys[0]` from the
scene registry with no player input involved. This spec covers
sub-project 2 from the original decomposition
(`docs/superpowers/specs/2026-09-10-gogologo-core-engine-design.md`):
an SSB-style screen where the player picks which Garabatos drawing
becomes their ship, replacing that arbitrary pick.

`PreloadScene` already fetches a pool of 12 drawings, converts each to a
transparent-background texture, and stores two parallel registry
entries: `drawingTextureKeys: string[]` (texture keys, used directly by
`GameScene`) and `drawings: { key: string; name: string }[]` (added
during sub-project 1's final review in anticipation of this feature —
pairs each texture key with the artist name for display). `GameScene`
assigns `drawingTextureKeys[0]` to the player and cycles enemies
starting from index 1.

## Goal

A new scene, `CharacterSelectScene`, sits between `MenuScene` and
`GameScene`. It shows all pooled drawings as a 4×3 grid of portraits
(texture + artist name), lets the player move a highlight with
keyboard or touch and confirm a pick, then reorders the registry's
drawing arrays so the pick lands at index 0 — meaning `GameScene`
needs zero code changes; it keeps reading index 0 as "the player's
ship" exactly as it does today.

## Scope

**In scope:** `CharacterSelectScene` (grid rendering, highlight
state, keyboard nav, touch nav, confirm-and-reorder logic);
`MenuScene`'s one-line change to start `CharacterSelectScene` instead
of `GameScene`; `game-config.ts`'s scene-array registration.

**Out of scope:** Any change to `GameScene`, `PreloadScene`,
`Enemy`, `Player`, or `input-system.ts` — none are needed. Re-selecting
on restart (restart continues to skip straight to a fresh `GameScene`,
reusing the already-picked drawing — unchanged from sub-project 1's
existing restart behavior). A "back to menu" control (no scene in this
game has back-navigation today; out of scope here too, consistent with
that pattern). Portrait animation/preview beyond a static texture +
name label.

## Design

### Scene flow

`MenuScene`'s start handler changes:
```ts
const start = (): void => {
  this.scene.start('CharacterSelectScene'); // was: 'GameScene'
};
```

`game-config.ts`'s `scene` array gains `CharacterSelectScene` between
`MenuScene` and `GameScene`:
```ts
scene: [BootScene, PreloadScene, MenuScene, CharacterSelectScene, GameScene, GameOverScene],
```

### Grid layout

4 columns × 3 rows (fits the pool size of 12 and the 480px-wide
canvas — 4 portraits across at ~100px each plus margins). Reads
`drawings: { key: string; name: string }[]` from the registry (same
array `PreloadScene` already populates — if the live pool has fewer
than 12 drawings, e.g. the placeholder-only fallback case, the grid
just renders fewer cells; no special-casing needed since the array is
already whatever length `PreloadScene` produced).

Each cell: `this.add.image(x, y, entry.key)` for the portrait,
`this.add.text(x, y + offset, entry.name, ...)` for the name label
underneath, both scaled/positioned to fit a fixed cell size.

### Highlight & keyboard input

One piece of state: `highlightedIndex`, starting at `0`. A visible
highlight — a bordered rectangle drawn with `this.add.graphics()`,
Peruvian accent red `0xd91023` (same color already used for this
game's fire button) — is redrawn around the current cell whenever
`highlightedIndex` changes.

Arrow keys move `highlightedIndex` through the grid with wraparound
at row/column edges (e.g. pressing Right on the last column of a row
wraps to that row's first column; pressing Down on the last row wraps
to the first row). Space or Enter confirms the highlighted pick —
consistent with `MenuScene`/`GameOverScene`'s existing "press Space"
convention for their single action.

### Touch input

Each portrait cell is `setInteractive()`. Tapping a cell:
- If it's not the currently highlighted cell: moves the highlight
  there (same visual update as a keyboard move).
- If it's already the highlighted cell: confirms the pick (same as
  Space/Enter).

This mirrors the two-step feel of keyboard's move-then-confirm without
needing a separate always-visible confirm button.

### Confirm & handoff

On confirm, given the chosen index `i` into the `drawings` array:
1. Reorder `drawings` so the chosen entry moves to index 0 (swap with
   whatever was at index 0, or splice-and-unshift — either produces a
   valid reordering; implementation picks whichever is simpler to
   read).
2. Derive `drawingTextureKeys` from the reordered `drawings` array
   (`drawings.map(d => d.key)`) and write both back to the registry
   via `this.registry.set(...)`, overwriting `PreloadScene`'s original
   values.
3. `this.scene.start('GameScene')`.

`GameScene` then runs completely unchanged: it reads
`drawingTextureKeys[0]` for the player (now the picked drawing) and
cycles enemies from index 1 (now guaranteed to start with a drawing
that isn't the player's pick, same off-by-one-avoidance the code
already has).

### Restart behavior

`GameOverScene`'s restart already calls `this.scene.start('GameScene')`
directly — unchanged. Because the registry retains the reordered
arrays from the confirm step, a restarted `GameScene` keeps using the
same picked drawing without re-visiting `CharacterSelectScene`.

## Testing

Same manual-verification convention as sub-project 1 (no test
framework in this repo's Phaser/Vite source): `npm run dev` +
Playwright — verify the grid renders all pool entries, keyboard
arrow-key navigation moves the highlight with correct wraparound,
Space/Enter confirms and transitions to `GameScene` with the picked
drawing as `drawingTextureKeys[0]`, touch tap-to-highlight and
tap-again-to-confirm both work (forcing `window.ontouchstart = null`
per sub-project 1's established technique), and a full restart loop
(`GameScene` → game-over → restart) skips `CharacterSelectScene` and
reuses the same pick.
