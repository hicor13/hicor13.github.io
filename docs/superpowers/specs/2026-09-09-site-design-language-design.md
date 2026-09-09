# Shared design language: persistent topbar + footer (Sub-project 1 of 5)

## Context

The user's larger ask ("make all the site have the same design language... add
ASCII art... redo the resume viewer... build a Galaga clone... add a parallax
gradient background... ship it on a public branch first") bundles six
independent subsystems. Per the brainstorming skill's decomposition rule,
these were split into an ordered sequence:

1. **This spec** — shared topbar + footer design language (index.html +
   pajaritos gallery)
2. ASCII art integration (folded into this spec's footer — see below)
3. Resume viewer → modal/lightbox preview, click again to open full page
4. Parallax animated gradient background, tied to scroll + nav-jump offsets
5. Galaga clone at `/Gogologo/`, Peruvian-themed, 16-bit, original build
   inspired by (not copied from) `technogeek00/css-galaga`'s mechanics

Sub-projects 2-5 are explicitly OUT OF SCOPE for this spec and the plan built
from it. Each gets its own brainstorm/spec/plan cycle later.

Hosting: per user decision, no public-domain branch preview — build on a
branch, verify locally (matches how this whole session has already been
verifying changes), skip DNS/subdomain work.

## Scope of this sub-project

Two pages only: `index.html` and `gallery/pajaritos/index.html`. Confirmed in
an earlier session (still valid): `libs/personal/base.css` (used by
`sections/blog`, `sections/gallery`, `sections/info`, `sections/projects`) has
zero theme-variable infrastructure — hardcoded colors, no `--bg`/`--fg`, no
`prefers-color-scheme` handling at all. Retrofitting that is a separate,
much larger job the user already declined once. Legacy pages
(`sections/info/about/*.html`, `sections/info/twiiter/twitter.html`,
`sections/projects/minecraft/index.html`) run their own bespoke stylesheets
and stay untouched.

## Architecture: shared components via custom elements

The site has no build step and no templating engine (per `CLAUDE.md`) — shared
chrome is normally hand-duplicated per page. `CLAUDE.md` notes an "unused
custom-element-based header/footer experiment... commented out at the bottom
of `libs/personal/index.js`" — read directly, it's dead 2021-era code (old
green color scheme `#3F5344`, a stale `hicor13@gmail.com` address, a DMCA
badge, placeholder `href="http://#"` links). Its *content* isn't reusable,
but its *mechanism* is sound: a `customElements.define` component that sets
`this.innerHTML` in `connectedCallback()`, using light DOM (no shadow root),
so page-level CSS still cascades into it normally.

This spec reuses that mechanism, written fresh, in a new file:
**`libs/personal/site-chrome.js`**. It defines two elements:

- `<site-topbar>` — renders the domain wordmark, language toggle, and theme
  toggle. Self-contained: attaches its own click handlers in
  `connectedCallback()` (theme persistence via `localStorage`, language
  switch via `document.documentElement.lang`/`dataset.lang`), so neither page
  needs to load page-specific toggle JS anymore.
- `<site-footer>` — renders the new footer (see Content below).

Both pages add `<script src="/libs/personal/site-chrome.js"></script>` and
place `<site-topbar></site-topbar>` / `<site-footer></site-footer>` tags where
the chrome belongs. The legacy commented-out block in
`libs/personal/index.js` is left as-is (out of scope to clean up here).

### Why this instead of continuing to hand-duplicate markup

Two pages need *identical* topbar behavior and an identical new footer. The
existing "duplicate chrome per page" convention was written for pages with
genuinely different chrome (different nav links, different structure) — here
the whole point is that the chrome is the same. A single component avoids
copy-drift between the two from day one; every other page's existing chrome
stays exactly as duplicated as it already is.

### `<site-topbar>` and existing styles.css classes

The element renders markup using the **same class names** already styled in
`styles.css` (`.theme-toggle`, `.lang-toggle`, `.theme-light`/`.theme-dark`,
`.lang-es`/`.lang-en`) so no new CSS is needed on index.html — the existing
rules apply unchanged since this is light DOM. `index.html`'s current
hand-written topbar markup (the `.hero-topbar` div, `.lang-toggle` button,
`.theme-toggle` button — all inside `<header class="hero">`) is replaced by
`<site-topbar></site-topbar>`, and `initThemeToggle()`/`initLangToggle()` are
removed from `script.js` (now owned by the custom element). `initScrollOffset()`
and `initNavSmoothScroll()` stay — unrelated to the toggles.

`gallery/pajaritos/index.html` gets `<site-topbar></site-topbar>` added inside
its existing `<header>`, above the `<h1>`/`.subtitle`. It has never had a
topbar before now.

### Pajaritos and theming — deliberately NOT unified

`gallery/pajaritos/` is fixed-dark (`background:#0a0a0a`, hardcoded white
text, its own font) — a deliberate photography-showcase choice, the same
pattern already established for `.cv-card` and the resume viewer (both stay
visually fixed regardless of site theme, by design, with an inline comment
explaining why). This spec keeps that: the gallery grid and lightbox stay
exactly as dark as they are. `<site-topbar>`'s own chrome uses
`var(--bg, #171613)` / `var(--fg, #ece8e0)` style fallbacks (dark defaults)
so it renders correctly on pajaritos even though that page defines no
`--bg`/`--fg` tokens at all. On index.html, the real tokens override the
fallback, so the topbar there stays governed by the toggle same as before.
The theme toggle still functions on the pajaritos page (flips `data-theme`,
persists via `localStorage`) — it just has no visible effect on the gallery
canvas beneath it, exactly like the resume viewer's toggle-independent dark
canvas today.

## Content: `<site-footer>`

Structure (Pengon-inspired, adapted — not copied verbatim; Pengon is a B2B
SaaS product with a multi-office/status-page footer, this is a personal
portfolio):

```
┌─────────────────────────────────────────────────┐
│  Mario Cornejo · mariocornejo.com                │
│  [ES/EN tagline — reuse hero-subtitle's copy]    │
│                                                   │
│  14:32   Lima, Perú                              │  ← live-updating clock,
│                                                   │    single city (not a
│                                                   │    fake multi-office row)
│  SITIO                    CONTACTO                │
│  Sobre mí                 LinkedIn                │
│  Proyectos                Email                   │
│  Notas                    WhatsApp                │
│  CV                                                │
│  Contacto                                          │
│  ─────────────────────────────────────────────    │
│  © 2026 Mario Cornejo · mariocornejo.com ·         │
│  cornejomariob@gmail.com                           │
│                                                     │
│  [ASCII art band — see below]                      │
└─────────────────────────────────────────────────┘
```

- Card container: `border:1px solid var(--pill-border, #3a362f)`,
  `border-radius` matching `.nav-pill`'s visual language, generous padding,
  background a touch different from page `--bg` (reuse `--pill-bg` token) so
  it reads as a distinct card, same visual family as the nav pills.
- Bilingual via the existing `data-i18n-es`/`data-i18n-en` pattern (the
  `html[data-lang]` CSS rule already handles show/hide — no new i18n
  mechanism needed).
- **SITIO/SITE column**: links to `#about`, `#projects`, `#notes`, `#cv`,
  `#contact` (index.html only — on pajaritos these need to be
  `/index.html#about` etc., since it's a different page).
- **CONTACTO/CONTACT column**: reuse the three existing links/icons from
  index.html's `.contact-links` section (`linkedin.com/in/hicor13`,
  `mailto:cornejomariob@gmail.com`, `wa.me/51979001717`) — icons optional
  here (smaller footer context), text links are enough.
- **Clock**: `Intl.DateTimeFormat` with `timeZone: 'America/Lima'`, updated
  every second via `setInterval` inside the custom element (cleared if the
  element is ever removed — unlikely on a static page, but correct
  hygiene). Monospace digit rendering (`font-variant-numeric: tabular-nums`)
  so it doesn't jitter in width as digits change.
- **Legal line**: `© 2026 Mario Cornejo · mariocornejo.com ·
  cornejomariob@gmail.com`. No fake "all systems operational" status —
  there's no real uptime monitoring behind this site, and fabricating one
  would be dishonest UI.

### ASCII art band

Hand-crafted (not a pixel-mapped photo conversion — tested and confirmed
illegible at any reasonable footer width; a stylized scene fits the
Pengon-style decorative-illustration spirit better anyway), depicting the
desert-oasis photo's composition: dune silhouette, two palm-flanked
"oasis lagoon" mounds, an "oasis lagoon" water band, two abstracted dune
buggies, "ICA" as a location label (the Huacachina/Ica region the photo is
from). Verified rendering (11px monospace, `line-height:1.15`) in a local
preview — legible, reads as a scene, not noise.

Exact content (verbatim, goes into the footer's HTML as preformatted text):

```
                                     _.--""--._
                              _.-'"              `'-._
                        _.-'"        .   .            `'-._
                  _.-'"         .        .     .           `'-.
            _.-="                    .        .       .        "=-._
      _.-="                 .    .         .        .      .        "=-.
.-'"     .    .    .    .          .    .        .    .      .   .       "'-.
                        _,,ww,,_        _,,ww,,_
                    ,#""    "  ""#,  ,#""    "  ""#,
                   #"  o     o    "##"  o     o    "#
                  #   .' PALM `.   ##   .' PALM `.   #
      ~~~~~~~~~~~#____________________________________#~~~~~~~~~~~
     ~~~~~~~~~~~~~~~   o a s i s   l a g o o n   ~~~~~~~~~~~~~~~~~~
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                  __n_n__                          __n_n__
              .-"`  ||  `"-.                    .-"`  ||  `"-.
             ( o)==[  ]==(o )                   ( o)==[  ]==(o )
              `""-.__||__.-""`                   `""-.__||__.-""`
- - - - - - - - - - - - - - - - - I C A - - - - - - - - - - - - - - - -
```

Rendered in a `<pre>` inside the footer, `font-size` scaled down at mobile
widths (the block is ~80 columns wide; at typical phone widths this needs a
smaller font, e.g. `clamp(6px, 1.6vw, 11px)`, or `overflow-x:auto` as a
fallback — implementer's call which reads better, consistent with the
horizontal-scroll fallback pattern already used for the mobile nav). Color:
`var(--muted, #9c9488)`, so it recedes rather than competing with the link
columns above it.

## Global constraints

- No new build tooling, no npm, no bundler — matches `CLAUDE.md`.
- `<site-topbar>`/`<site-footer>` must use light DOM (no shadow root) so
  existing global CSS (`styles.css` classes) keeps applying unchanged.
- Cache-bust query strings on changed `<script>`/`<link>` tags, per this
  repo's existing convention (`?v=YYYYMMDDx`) — bump on every page that
  changes.
- Root-relative paths (`/libs/personal/site-chrome.js`) for the new shared
  script, matching how `sections/*` pages already reference `/libs/...`.
- Existing `initThemeToggle`/`initLangToggle` removal from `script.js` must
  not break `initScrollOffset`/`initNavSmoothScroll`/`initHeroIntro`/
  `initScrollReveal`, which stay.
- Verify in-browser (this session has Playwright available) at minimum:
  desktop width, mobile width (~375px), theme toggle on both pages, language
  toggle on index.html, footer link correctness on pajaritos (must resolve
  to `/index.html#section`, not `#section`).

## Testing

- Manual/Playwright verification of: topbar renders + functions on both
  pages; theme persists across a page navigation between the two (localStorage);
  footer renders on both with correct (relative vs. `/index.html#...`) links;
  ASCII art legible at desktop and mobile widths; clock updates and shows
  Lima time; no console errors from the new custom elements.
- No automated test suite exists in this repo (per `CLAUDE.md`) — this
  sub-project doesn't introduce one.
