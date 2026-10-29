# Garabatos: public scratch-art board + mini gallery

## Context

New feature, no existing flow to extend: a page where any visitor draws on a
scratch-art canvas (black wax coating, drag to reveal rainbow color beneath —
the literal kids'-toy mechanic, not a generic paint app) and saves the result
to a small public gallery visible to every visitor. Site is a static GitHub
Pages deploy (`CLAUDE.md`: no build step, no bundler, no server code) — a
real shared, persistent gallery needs a hosted backend the static site can
talk to directly from the browser. Decisions locked in during brainstorming
(see chat log for the Q&A that produced them):

- Lives at `/garabatos/index.html` as a new subpage, same structural pattern
  as `gallery/pajaritos/` (self-contained folder, own `styles.css`/`script.js`,
  shared `<site-topbar>`/`<site-footer>` chrome from `libs/personal/site-chrome.js`).
- Backend: **Supabase** (Postgres table + Storage bucket, no Edge
  Functions) — a backend-as-a-service avoids writing/hosting/maintaining any
  server code, matching the site's zero-infrastructure constraint. Client
  library (`@supabase/supabase-js` v2, UMD build) is loaded via CDN
  `<script>` tag exposing a `window.supabase.createClient(...)` global — no
  build step, matches the site's existing no-bundler constraint.
  **Revision (2026-09-10):** originally speced against Firebase
  (Firestore + Storage); switched to Supabase after the user hit Firebase's
  new policy requiring a billing card on file to enable Storage on a new
  project, even to stay within the free quota. Supabase's free tier needs no
  card. Firestore/Storage-specific details below are Supabase's Postgres/
  Storage equivalents, not Firebase's.
- No login/auth — anonymous public writes, matching "anyone can draw."
- Moderation: instant publish, manual delete via the Supabase dashboard. No
  approval queue, no admin page.
- Retention: gallery only ever **displays** the most recent 60 drawings
  (`order(created_at, desc).limit(60)`). Older rows/files are not deleted —
  true scheduled deletion needs a Supabase Edge Function or pg_cron job,
  extra infrastructure not justified at this scale. Storage growth is
  trivial at hobby-site volume (Supabase free tier: 1GB storage — tens of
  thousands of drawings at this file size).

## Scope

One new subpage plus one new project card linking to it from `index.html`'s
Proyectos section. Nothing else on the existing site changes. Out of scope:
Cloud Functions, authentication, an admin/moderation UI, App Check/reCAPTCHA
bot-hardening (flagged as an easy future addition if the gallery is abused,
not built now).

## Architecture

### Canvas mechanic (`garabatos/script.js`)

Single `<canvas>`, fixed internal resolution 640×400 (matches a 16:10 card
shape, consistent gallery thumbnails regardless of viewport), scaled to
`width:100%` in CSS up to a `max-width` matching the site's existing card
sizing (~600px) — same devicePixelRatio-scaling technique already used for
the resume PDF canvases in the main `script.js` (`canvas.width = cssWidth *
dpr`, then CSS handles display size).

Paint sequence on load/reset (one canvas, two sequential fills, no offscreen
layer):
1. `ctx.createLinearGradient` left-to-right, color stops sweeping the
   rainbow (red → orange → yellow → green → blue → indigo → violet),
   `fillRect` the whole canvas.
2. `ctx.fillStyle = '#111'; ctx.fillRect(...)` — opaque wax coating over the
   gradient.

Scratching: `pointerdown`/`pointermove`/`pointerup` listeners (covers mouse,
touch, and pen in one event family — no separate touch handlers needed).
While the pointer is down, on each move: draw a stroked line (round
`lineCap`/`lineJoin`) from the previous point to the current point at
`lineWidth = brushSize`, using the **same `CanvasGradient` object** created
for the initial paint as `strokeStyle` under normal `source-over`
compositing — a line, not just a dot per event, so fast drags don't leave
gaps between sparse `pointermove` samples. Pointer coordinates are converted
from page space to canvas-buffer space via the canvas's
`getBoundingClientRect()`, same math pattern as `initResumeModal`'s viewport
scaling in the main `script.js`.

**Revision (implementation finding, Task 2):** the plan originally called
for `ctx.globalCompositeOperation = 'destination-out'` to erase the wax and
reveal the gradient "underneath." That doesn't work: a canvas is a flat
raster, and the opaque wax `fillRect` (`source-over`, alpha 1) fully
overwrites the gradient pixel data on the same buffer — there is no
preserved layer for `destination-out` to reveal, only the transparent page
background. The fix (stroking with the cached original gradient object
directly) produces the identical required visual effect — verified against
the compositing math and confirmed correct by task review.

Controls:
- Brush size: `<input type="range" min="4" max="40" value="16">`.
- Clear: re-runs the paint sequence (fresh gradient + wax, discards current
  scratch).
- Name: `<input type="text" maxlength="40">`, optional. Empty/whitespace-only
  input falls back to "Anónimo" (ES) / "Anonymous" (EN) at save time, chosen
  by `document.documentElement.lang`.
- Guardar/Save button: see Save flow below.

### Save flow

1. Disable the Save button (prevents double-submit while the async work
   below is in flight).
2. Client-side throttle: read `localStorage.getItem('garabatos-last-save')`.
   If `Date.now() - lastSave < 30000`, show an inline message ("Espera un
   momento antes de guardar otro dibujo" / "Wait a moment before saving
   another drawing"), re-enable the button, abort. This deters
   accidental double-clicks/spam, not a determined bad actor — acceptable at
   this site's traffic level (see Abuse mitigation).
3. `canvas.toBlob('image/png')` — a `Blob`, not a base64 data URL, for a
   direct Storage upload (smaller, avoids ever needing to fit the image into
   a database column).
4. `const id = crypto.randomUUID()`. Upload the blob to the `drawings`
   Storage bucket under key `${id}.png` via `client.storage.from('drawings').upload(...)`.
5. On successful upload: insert a row via `client.from('drawings').insert({
   id, name, storage_path: '${id}.png' })` — `created_at` is a database
   column default (`now()`), never sent by the client, so there's no
   client-controllable timestamp to spoof.
6. On success: write `localStorage.setItem('garabatos-last-save',
   Date.now())`, show a brief confirmation ("¡Guardado!" / "Saved!"),
   prepend the new drawing to the on-page gallery grid without a full
   refetch, re-run the paint sequence (auto-clear, ready for the next
   drawing), re-enable the button.
7. On failure (network error, rules rejection, quota): show an inline error
   message, re-enable the button, leave the canvas untouched so the user
   doesn't lose their work and can retry.

### Gallery (`garabatos/index.html` gallery section)

On page load: `client.from('drawings').select('name, storage_path,
created_at').order('created_at', { ascending: false }).limit(60)`. Render
each row as a grid `<img loading="lazy">`, `alt`/`title` set to the
drawing's `name`. Image `src` is built directly from `storage_path` using
Supabase Storage's public object URL format —
`https://<project-ref>.supabase.co/storage/v1/object/public/drawings/${storagePath}`
— which works without a signed token because the bucket is public and the
Storage policy below scopes public read to the `drawings` bucket. Empty
state (zero drawings yet): "Sé el primero en dejar un garabato" / "Be the
first to leave a doodle". No pagination beyond the 60-item cap, per
Retention above.

### Supabase project setup (one-time, done by the user)

I write all code; the user creates a free Supabase project (supabase.com,
no card required), creates the `drawings` table and Storage bucket, and
pastes in the SQL below to set up row-level security, then hands me the
project URL and anon public key — these are safe to expose client-side by
Supabase's own design (RLS is what actually gates access, not secrecy of
these values). I'll provide the exact dashboard click-path and the SQL text
(below) to paste in at that time.

### Database schema + row-level security (SQL editor)

```sql
create table drawings (
  id uuid primary key,
  name text not null check (char_length(name) <= 40),
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table drawings enable row level security;

create policy "Public read" on drawings
  for select using (true);

create policy "Public insert with matching storage path" on drawings
  for insert with check (
    storage_path = id::text || '.png'
  );

-- Client can set id/name/storage_path only — created_at is
-- always the server-side column default (now()), never
-- client-supplied, so there's nothing to spoof.
revoke insert on drawings from anon;
grant insert (id, name, storage_path) on drawings to anon;
```

No `update`/`delete` policy is created at all — with RLS enabled, the
absence of a policy for an action denies it by default, so moderation
deletes only happen from the Supabase dashboard (which uses the service
role, unaffected by RLS), never from client code.

### Storage bucket + policies (SQL editor, after creating a public bucket named `drawings` in the dashboard)

```sql
create policy "Public read for drawings bucket"
on storage.objects for select
using (bucket_id = 'drawings');

create policy "Public insert for drawings bucket"
on storage.objects for insert
with check (bucket_id = 'drawings');
```

Bucket-scoping (`bucket_id = 'drawings'`) is the load-bearing check — it
stops anonymous writes from landing anywhere else in the project's storage.
File-size/content-type enforcement at the RLS layer is less
straightforward on Supabase than Firebase's `request.resource.size`
equivalent; since the client only ever generates PNGs itself (`canvas.toBlob('image/png')`
on a fixed 640×400 canvas, inherently small), this is an accepted, smaller
residual risk versus the original Firebase design's explicit size/type
rule — verify during Task 3 that a real upload through the app succeeds and
that the bucket stays scoped correctly.

### Abuse mitigation

No auth means no per-user identity to rate-limit against; mitigations at
this stage are the RLS policies above (bucket/shape scoping) plus the
client-side 30s throttle (deters accidental spam, not bots). Real
bot-hardening (e.g. Cloudflare Turnstile in front of the insert/upload
calls) is a known, easy follow-up if the gallery is ever actually abused —
not built now (YAGNI at a personal portfolio site's traffic level).
Moderation is manual: delete the table row and Storage object for anything
inappropriate via the Supabase dashboard.

### Integration with the main site

New project card in `index.html`'s Proyectos section, same markup pattern as
the existing pajaritos card (`<a class="card-link" href="/garabatos/index.html">`
wrapping a thumbnail image + bilingual title/description). Thumbnail: a
small pre-rendered scratch-art PNG I generate (illustrative, not a live
screenshot) since the page has no real content yet at card-creation time.
`garabatos/index.html` uses `<site-topbar>` and `<site-footer
base="/index.html">` exactly like `gallery/pajaritos/index.html`, and
follows the same `data-i18n-es`/`data-i18n-en` bilingual pattern as the rest
of the site.

## Global constraints

- No build tooling, no npm, no bundler — `@supabase/supabase-js` v2 (UMD
  build) loaded via a plain CDN `<script>` tag (`window.supabase.createClient`),
  no ES module graph needed.
- Root-relative paths for shared assets (`/libs/personal/site-chrome.js`),
  matching existing site convention.
- Cache-bust query strings (`?v=YYYYMMDDx`) on any changed `<script>`/`<link>`
  tag, per this repo's existing convention.
- Two-repo sync: every new/changed file gets copied to both the source repo
  (`Resume-Site`, no remote) and the deploy repo (`hicor13.github.io`,
  pushes to production) before commit, per this session's established
  workflow. Never touch `/gallery/pajaritos/` or stage unrelated
  pre-existing modified files.
- Supabase project URL + anon key go directly into `garabatos/script.js` as
  plain constants — expected and safe per Supabase's own design (see
  Supabase project setup above). Never introduce a real secret (e.g. the
  `service_role` key) anywhere in this static site.

## Testing

- Manual/Playwright verification of the canvas mechanic itself (scratch
  reveals color under simulated pointer drag, brush size changes stroke
  width, Clear resets to solid wax) requires no backend and can be fully
  verified locally.
- End-to-end save → Storage upload → table insert → gallery re-render
  requires a live Supabase project — this can only be verified once the
  user has created the project and handed over the URL/anon key. Until
  then, the save/gallery code paths are verified by inspection and, where
  practical, against a temporary/throwaway Supabase project if one is
  convenient to spin up during implementation.
- No automated test suite exists in this repo (per `CLAUDE.md`) — this
  feature doesn't introduce one.
