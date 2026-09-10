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
- Backend: **Firebase** (Firestore + Storage, no Cloud Functions) — a
  backend-as-a-service avoids writing/hosting/maintaining any server code,
  matching the site's zero-infrastructure constraint. Client SDK is loaded
  via CDN `import()` from a page-level `<script type="module">`, same dynamic
  `import()` precedent already used for PDF.js in `script.js`'s resume
  viewer.
- No login/auth — anonymous public writes, matching "anyone can draw."
- Moderation: instant publish, manual delete via Firebase Console. No
  approval queue, no admin page.
- Retention: gallery only ever **displays** the most recent 60 drawings
  (`orderBy(createdAt, desc).limit(60)`). Older docs/files are not deleted —
  true deletion needs a scheduled Cloud Function, which needs Firebase's
  paid Blaze plan (billing account attached, even though usage stays $0 at
  this scale). Staying on the free Spark plan was chosen over literal
  enforcement of the cap; storage growth is trivial at hobby-site volume
  (free tier is 5GB — tens of thousands of drawings at this file size).

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
While the pointer is down, on each move: `ctx.globalCompositeOperation =
'destination-out'`, draw a stroked line (round `lineCap`/`lineJoin`) from the
previous point to the current point at `lineWidth = brushSize * dpr` — a
line, not just a dot per event, so fast drags don't leave gaps between
sparse `pointermove` samples. Pointer coordinates are converted from page
space to canvas-buffer space via the canvas's `getBoundingClientRect()` plus
the dpr scale factor, same math pattern as `initResumeModal`'s viewport
scaling in the main `script.js`.

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
   direct Storage upload (smaller, avoids Firestore's 1MiB document-size
   limit entirely since the image never touches a Firestore field).
4. `const id = crypto.randomUUID()`. Upload the blob to Storage path
   `drawings/${id}.png` via `uploadBytes()`.
5. On successful upload: `setDoc(doc(db, 'drawings', id), { name,
   storagePath: 'drawings/${id}.png', createdAt: serverTimestamp() })`.
6. On success: write `localStorage.setItem('garabatos-last-save',
   Date.now())`, show a brief confirmation ("¡Guardado!" / "Saved!"),
   prepend the new drawing to the on-page gallery grid without a full
   refetch, re-run the paint sequence (auto-clear, ready for the next
   drawing), re-enable the button.
7. On failure (network error, rules rejection, quota): show an inline error
   message, re-enable the button, leave the canvas untouched so the user
   doesn't lose their work and can retry.

### Gallery (`garabatos/index.html` gallery section)

On page load: `getDocs(query(collection(db, 'drawings'), orderBy('createdAt',
'desc'), limit(60)))`. Render each doc as a grid `<img loading="lazy">`,
`alt`/`title` set to the drawing's `name`. Image `src` is built directly from
`storagePath` using Firebase Storage's public download URL format —
`https://firebasestorage.googleapis.com/v0/b/<BUCKET>/o/${encodeURIComponent(storagePath)}?alt=media`
— which works without a signed token because the Storage security rule
below makes the `drawings/` path publicly readable; this avoids an extra
`getDownloadURL()` round-trip per image. Empty state (zero drawings yet):
"Sé el primero en dejar un garabato" / "Be the first to leave a doodle". No
pagination beyond the 60-item cap, per Retention above.

### Firebase project setup (one-time, done by the user)

I write all code; the user creates the Firebase project (console.firebase.google.com,
free Spark plan, no card required) and enables Firestore (production mode)
and Storage, then hands me the web-app config object (`apiKey`,
`authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) —
these are safe to expose client-side by Firebase's own design; the security
rules below are what actually gate access, not secrecy of these values.
I'll provide the exact console click-path and the rules text (below) to
paste in at that time.

### Firestore security rules

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

`storagePath == 'drawings/' + drawingId + '.png'` ties the Firestore doc ID
to the Storage filename, so a doc can never point at an image the writer
didn't just upload under that same ID. `createdAt == request.time` forces
use of the server timestamp (blocks a client from writing an arbitrary/fake
date). `update, delete: if false` — moderation deletes happen only from the
Firebase Console (which uses admin credentials, unaffected by these rules),
never from client code.

### Storage security rules

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

2MB cap is generous headroom for a 640×400 PNG (typically tens of KB even
for a busy scratch drawing) while blocking anyone from using the endpoint to
host arbitrarily large files.

### Abuse mitigation

No auth means no per-user identity to rate-limit against; mitigations at
this stage are the security rules above (size/type/shape caps) plus the
client-side 30s throttle (deters accidental spam, not bots). Real
bot-hardening (Firebase App Check with invisible reCAPTCHA) is a known,
easy follow-up if the gallery is ever actually abused — not built now
(YAGNI at a personal portfolio site's traffic level). Moderation is manual:
delete the Firestore doc and Storage file for anything inappropriate via the
Firebase Console.

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

- No build tooling, no npm, no bundler — Firebase JS SDK loaded via
  `import()` from the `gstatic.com` CDN inside a `<script type="module">`,
  matching the existing PDF.js dynamic-import precedent in `script.js`.
- Root-relative paths for shared assets (`/libs/personal/site-chrome.js`),
  matching existing site convention.
- Cache-bust query strings (`?v=YYYYMMDDx`) on any changed `<script>`/`<link>`
  tag, per this repo's existing convention.
- Two-repo sync: every new/changed file gets copied to both the source repo
  (`Resume-Site`, no remote) and the deploy repo (`hicor13.github.io`,
  pushes to production) before commit, per this session's established
  workflow. Never touch `/gallery/pajaritos/` or stage unrelated
  pre-existing modified files.
- Firebase config values go directly into `garabatos/script.js` as plain
  constants — expected and safe per Firebase's own design (see Firebase
  project setup above). Never introduce a real secret (e.g. a service
  account key) anywhere in this static site.

## Testing

- Manual/Playwright verification of the canvas mechanic itself (scratch
  reveals color under simulated pointer drag, brush size changes stroke
  width, Clear resets to solid wax) requires no backend and can be fully
  verified locally.
- End-to-end save → Storage upload → Firestore write → gallery re-render
  requires a live Firebase project — this can only be verified once the
  user has created the project and handed over config values. Until then,
  the save/gallery code paths are verified by inspection and, where
  practical, against a temporary/throwaway Firebase project if one is
  convenient to spin up during implementation.
- No automated test suite exists in this repo (per `CLAUDE.md`) — this
  feature doesn't introduce one.
