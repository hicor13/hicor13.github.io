# Shared Topbar + Footer Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `index.html` and `gallery/pajaritos/index.html` a shared, persistent topbar (theme + language toggle) and a new Pengon-inspired footer (site links, contact links, a Lima clock, and a hand-drawn ASCII desert scene), without introducing a build step or templating engine.

**Architecture:** Two self-contained custom elements (`<site-topbar>`, `<site-footer>`), light DOM (no shadow root) so page-level CSS still cascades, each shipping its own `<style>` so they render correctly regardless of which stylesheet the host page loads. Defined once in a new file, `libs/personal/site-chrome.js`, included via `<script>` on both pages.

**Tech Stack:** Vanilla JS custom elements (`customElements.define`), vanilla CSS custom properties with fallbacks (`var(--fg, #ece8e0)`), `Intl.DateTimeFormat` for the clock. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-09-site-design-language-design.md`

## Deviation from spec

The spec's Architecture section claims `<site-topbar>` needs "no new CSS...
on index.html" by reusing the existing `.theme-toggle`/`.lang-toggle`
classes from `styles.css`. That's only true for `index.html` — the same
markup on the pajaritos page would be unstyled, since that page loads its
own separate `gallery/pajaritos/styles.css` with none of those rules.

**Ruling:** `<site-topbar>` (and `<site-footer>`) ship fully self-contained
CSS instead, under new component-scoped class names
(`.site-topbar-*`/`.site-footer-*`), with `var(--token, fallback)` values so
they read index.html's real design tokens where available and fall back to
sensible dark defaults where not. The old `.hero-topbar`/`.lang-toggle`/
`.theme-toggle` rules in `styles.css` are deleted in Task 2 once nothing
references them. This is what makes both components actually portable
between the two pages' very different stylesheets, which is the spec's
stated goal even though its literal implementation note undersold what
portability requires.

## Global Constraints

- No new build tooling, no npm, no bundler.
- `<site-topbar>`/`<site-footer>` use light DOM only — no shadow root.
- Cache-bust query strings (`?v=YYYYMMDDx`) on every changed `<script>`/`<link>` tag, bumped past the current highest value in the file being edited.
- Root-relative paths (`/libs/personal/site-chrome.js`) for the new shared script, matching how `sections/*` pages already reference `/libs/...`.
- `gallery/pajaritos/index.html` links in the footer's site-nav column must resolve to `/index.html#about` etc. (a different page), not bare `#about`.
- No fake "operational status" indicator — no real uptime monitoring exists behind this site.
- This repo has no automated test suite (per `CLAUDE.md`) — verification is manual/Playwright-driven, described concretely per task below.
- Local verification: `python3 -m http.server 8000` from the repo root, then visit `http://localhost:8000/...`.

---

### Task 1: Build `<site-topbar>` in a new shared file

**Files:**
- Create: `libs/personal/site-chrome.js`
- Test: `testing/site-topbar-check.html` (throwaway manual-verification harness, deleted at the end of this task once verified — matches this repo's `testing/` convention of scratch pages not linked from navigation)

**Interfaces:**
- Produces: a global custom element `<site-topbar></site-topbar>` that, once `libs/personal/site-chrome.js` is loaded, renders a theme toggle (left), the domain wordmark (center, links to `https://mariocornejo.com`), and a language toggle (right). It is `position: absolute; top: 1.5rem; left: 1.5rem; right: 1.5rem;` on itself, so it must be placed inside an ancestor that establishes a CSS positioning context (`position: relative` or similar) — Task 2 and Task 3 are responsible for that on their respective pages.
- Theme toggle: on click, flips `document.documentElement`'s `data-theme` attribute between `light`/`dark`, persists the choice to `localStorage` under the key `theme`. Does NOT read `localStorage` on load itself — the host page's own inline head script is responsible for applying a stored theme before paint (this already exists on `index.html`; Task 3 must confirm/add the equivalent on the pajaritos page).
- Language toggle: on click, flips `document.documentElement.lang` and `document.documentElement.dataset.lang` between `es`/`en`. Does not persist (matches current behavior — language was never persisted before this change either).

- [ ] **Step 1: Create `libs/personal/site-chrome.js` with the `SiteTopbar` element**

```js
// libs/personal/site-chrome.js
//
// Shared, self-contained topbar and footer used by index.html and
// gallery/pajaritos/index.html. Light DOM (no shadow root) so each
// component ships its own <style> instead of depending on whichever
// stylesheet the host page happens to load — this is what lets the same
// two tags work correctly on index.html's --bg/--fg design-token system
// and on pajaritos's separate, token-less stylesheet.

class SiteTopbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        site-topbar {
          display: block;
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
        }
        site-topbar .site-topbar-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        site-topbar .site-topbar-domain {
          flex: 1;
          text-align: center;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          color: var(--fg, #ece8e0);
          text-decoration: none;
        }
        site-topbar button {
          background: none;
          border: none;
          font: inherit;
          color: var(--muted, #9c9488);
          cursor: pointer;
          padding: 0;
        }
        site-topbar .site-topbar-theme-light,
        site-topbar .site-topbar-theme-dark,
        site-topbar .site-topbar-lang-es,
        site-topbar .site-topbar-lang-en {
          font-weight: 400;
        }
        site-topbar .site-topbar-theme[data-theme="light"] .site-topbar-theme-light,
        site-topbar .site-topbar-theme[data-theme="dark"] .site-topbar-theme-dark,
        site-topbar .site-topbar-lang[data-lang="es"] .site-topbar-lang-es,
        site-topbar .site-topbar-lang[data-lang="en"] .site-topbar-lang-en {
          font-weight: 700;
          color: var(--fg, #ece8e0);
        }
      </style>
      <div class="site-topbar-row">
        <button class="site-topbar-theme" type="button">
          <span class="site-topbar-theme-light">☀</span> / <span class="site-topbar-theme-dark">☾</span>
        </button>
        <a class="site-topbar-domain" href="https://mariocornejo.com">mariocornejo.com</a>
        <button class="site-topbar-lang" type="button">
          <span class="site-topbar-lang-es">ES</span> / <span class="site-topbar-lang-en">EN</span>
        </button>
      </div>
    `;

    this.initTheme();
    this.initLang();
  }

  initTheme() {
    const button = this.querySelector('.site-topbar-theme');

    const current = () => {
      const stored = document.documentElement.getAttribute('data-theme');
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    button.dataset.theme = current();

    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      button.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
    });
  }

  initLang() {
    const button = this.querySelector('.site-topbar-lang');
    const initialLang = document.documentElement.dataset.lang || document.documentElement.lang || 'es';
    button.dataset.lang = initialLang;

    button.addEventListener('click', () => {
      const newLang = button.dataset.lang === 'es' ? 'en' : 'es';
      button.dataset.lang = newLang;
      document.documentElement.lang = newLang;
      document.documentElement.dataset.lang = newLang;
    });
  }
}

customElements.define('site-topbar', SiteTopbar);
```

- [ ] **Step 2: Write a throwaway verification harness**

```html
<!doctype html>
<html lang="es" data-lang="es">
<head>
  <meta charset="UTF-8">
  <title>site-topbar check</title>
  <style>body { position: relative; min-height: 6rem; background: #171613; margin: 0; }</style>
</head>
<body>
  <site-topbar></site-topbar>
  <script src="/libs/personal/site-chrome.js"></script>
</body>
</html>
```

Save this as `testing/site-topbar-check.html`.

- [ ] **Step 3: Verify in-browser with Playwright**

Start the local server if it isn't already running: `python3 -m http.server 8000` from the repo root.

Navigate to `http://localhost:8000/testing/site-topbar-check.html` and check:
- The topbar renders: theme toggle left, "mariocornejo.com" center, language toggle right.
- Click the theme toggle. Verify `document.documentElement.getAttribute('data-theme')` becomes `"dark"` (the harness starts with no `prefers-color-scheme` override, so first click should flip from whatever the OS default resolves to), and `localStorage.getItem('theme')` matches.
- Click the language toggle. Verify `document.documentElement.lang` and `document.documentElement.dataset.lang` both become `"en"`, and the `EN` span goes bold (`font-weight: 700`) while `ES` doesn't (check via `getComputedStyle`).
- No console errors.

- [ ] **Step 4: Delete the throwaway harness**

```bash
rm testing/site-topbar-check.html
```

- [ ] **Step 5: Commit**

```bash
git add libs/personal/site-chrome.js
git commit -m "feat: add self-contained site-topbar custom element"
```

---

### Task 2: Wire `<site-topbar>` into index.html, remove the old hand-written topbar

**Files:**
- Modify: `index.html`
- Modify: `script.js`

**Interfaces:**
- Consumes: `<site-topbar>` from Task 1 (`libs/personal/site-chrome.js`).
- Produces: nothing new — this task is a swap, not an addition. `initHeroIntro`, `initScrollReveal`, `initNavSmoothScroll`, `initScrollOffset` in `script.js` are unaffected and must still work identically afterward (they don't touch the topbar).

`index.html`'s `<header class="hero">` currently contains (verify exact current content with `grep -n "hero-topbar\|lang-toggle\|theme-toggle" index.html` before editing, since this file has been edited by hand outside this plan since the spec was written — the wordmark line in particular may already be a link rather than a bare `<span>`):

```html
  <header class="hero">
    <div class="hero-topbar">
      <a href="https://mariocornejo.com" style="color:inherit;text-decoration:none;">mariocornejo.com</a>
    </div>

    <div class="hero-plate reveal" id="hero-plate">
      ...
    </div>

    <button class="lang-toggle" type="button" data-lang="es">
      <span class="lang-es">ES</span> / <span class="lang-en">EN</span>
    </button>

    <button class="theme-toggle" type="button">
      <span class="theme-light">☀</span> / <span class="theme-dark">☾</span>
    </button>
  </header>
```

- [ ] **Step 1: Replace the topbar markup with `<site-topbar>`**

Remove the `.hero-topbar` div and both `.lang-toggle`/`.theme-toggle` buttons; add `<site-topbar></site-topbar>` as the first child of `<header class="hero">`, before `.hero-plate`:

```html
  <header class="hero">
    <site-topbar></site-topbar>

    <div class="hero-plate reveal" id="hero-plate">
      ...
    </div>
  </header>
```

(`.hero` is already `position: relative` — confirmed at `styles.css:78` — so `<site-topbar>`'s own `position: absolute` positions correctly against it, identically to how `.hero-topbar` positioned before.)

- [ ] **Step 2: Add the shared script tag**

Add, right after the existing `styles.css` link (matching this file's existing cache-bust convention — read the current `?v=` value in the file and use the same value for consistency, then Task 5 will do a final bump across all touched files):

```html
  <script src="/libs/personal/site-chrome.js"></script>
```

- [ ] **Step 3: Remove the now-dead CSS from `styles.css`**

Delete these rule blocks (all now unused — nothing renders `.hero-topbar`, `.lang-toggle`, or `.theme-toggle` markup anymore on this page):

```css
.hero-topbar {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  right: 1.5rem;
  display: flex;
  justify-content: center;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}
```

```css
.lang-toggle {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  font: inherit;
  color: var(--muted);
  cursor: pointer;
}

.lang-toggle .lang-es,
.lang-toggle .lang-en {
  font-weight: 400;
}

.lang-toggle[data-lang="es"] .lang-es,
.lang-toggle[data-lang="en"] .lang-en {
  font-weight: 700;
  color: var(--fg);
}

.theme-toggle {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  background: none;
  border: none;
  font: inherit;
  color: var(--muted);
  cursor: pointer;
}

.theme-toggle .theme-light,
.theme-toggle .theme-dark {
  font-weight: 400;
}

.theme-toggle[data-theme="light"] .theme-light,
.theme-toggle[data-theme="dark"] .theme-dark {
  font-weight: 700;
  color: var(--fg);
}
```

Locate the exact current line ranges with `grep -n "hero-topbar\|\.lang-toggle\|\.theme-toggle" styles.css` before deleting — this file has also had edits since the spec was written.

- [ ] **Step 4: Remove `initThemeToggle`/`initLangToggle` from `script.js`**

Delete the `initThemeToggle` and `initLangToggle` function definitions entirely, and remove their calls from `init()`. `init()` should end up as:

```js
function init() {
  initHeroIntro();
  initScrollReveal();
  initNavSmoothScroll();
  initScrollOffset();
}
```

- [ ] **Step 5: Bump cache-bust query strings**

In `index.html`, bump the `?v=` value on `styles.css`, `script.js`, and the new `/libs/personal/site-chrome.js` script tag to the same new value (one past whatever the file currently has — check with `grep -n "v=202" index.html` first).

- [ ] **Step 6: Verify in-browser with Playwright**

Start the local server if needed, navigate to `http://localhost:8000/`, and check:
- The topbar renders in the same visual position as before (theme toggle top-left, wordmark centered, language toggle top-right).
- Clicking the theme toggle flips the page background between light/dark and persists across a reload.
- Clicking the language toggle switches all `data-i18n-es`/`data-i18n-en` content.
- The hero reveal animation (`#hero-plate` fading/sliding in on load) still plays.
- Clicking a nav pill (e.g. "Notas"/"Notes") still smooth-scrolls to the right section, landing clear of the sticky nav (this exercises `initScrollOffset`/`initNavSmoothScroll`, unrelated to this task's changes, but a regression here would mean the topbar swap broke something unexpected).
- At a ~375px-wide viewport, the mobile hero stack (portrait + title) still starts clear of the topbar (no clipping) — this exercises the `padding-top: 4.5rem` mobile fix from a previous session, which depends on the topbar still being `position: absolute` and out of flex flow. Confirm no console errors.

- [ ] **Step 7: Commit**

```bash
git add index.html script.js styles.css
git commit -m "feat: wire site-topbar into index.html, remove old hand-written topbar"
```

---

### Task 3: Wire `<site-topbar>` into `gallery/pajaritos/index.html`

**Files:**
- Modify: `gallery/pajaritos/index.html`
- Modify: `gallery/pajaritos/styles.css`

**Interfaces:**
- Consumes: `<site-topbar>` from Task 1.
- Produces: nothing new for later tasks to consume, beyond the page now having a working, themed topbar.

`gallery/pajaritos/index.html`'s `<header>` currently contains only an `<h1>` and a `.subtitle` `<p>`, with no positioning context (its `header { padding: 40px 20px; text-align: center; }` rule has no `position` declared, so it's `static`).

- [ ] **Step 1: Add `position: relative` to the header in `gallery/pajaritos/styles.css`**

```css
header {
    padding: 40px 20px;
    text-align: center;
    position: relative;
}
```

(This gives `<site-topbar>`'s `position: absolute` a valid containing block, exactly as `.hero`'s existing `position: relative` does on `index.html`. It doesn't change this page's visual layout otherwise.)

- [ ] **Step 2: Add the shared script tag and `<site-topbar>` in `gallery/pajaritos/index.html`**

Add the script tag next to the existing `styles.css` link:

```html
    <link rel="stylesheet" href="styles.css">
    <script src="/libs/personal/site-chrome.js"></script>
```

Add `<site-topbar></site-topbar>` as the first child inside `<header>`, before the `<h1>`:

```html
<header>
    <site-topbar></site-topbar>
    <h1>MARIO CORNEJO</h1>
    <p class="subtitle">Pajaritos Album</p>
</header>
```

(Confirm the exact current `<h1>` text/casing with `grep -n "<h1" gallery/pajaritos/index.html` before editing — reproduce it unchanged.)

- [ ] **Step 3: Add an early theme-restore script (matches `index.html`'s pattern)**

`index.html` restores a stored theme choice before paint via an inline `<script>` in `<head>`, so a returning visitor doesn't see a flash of the wrong theme. Add the same to `gallery/pajaritos/index.html`'s `<head>`, right after its `styles.css` link:

```html
    <script>
      try {
        var storedTheme = localStorage.getItem('theme');
        if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);
      } catch (e) {}
    </script>
```

- [ ] **Step 4: Bump cache-bust query strings**

`gallery/pajaritos/index.html` currently loads `styles.css` and `script.js` without any `?v=` query string (confirm with `grep -n "stylesheet\|<script" gallery/pajaritos/index.html`) — this page doesn't use the cache-busting convention yet. Leave its own `styles.css`/`script.js`/`images-data.js` references as-is (out of scope to retrofit); add the new `/libs/personal/site-chrome.js` tag without a query string too, for consistency with this page's existing (non-cache-busted) script tags.

- [ ] **Step 5: Verify in-browser with Playwright**

Navigate to `http://localhost:8000/gallery/pajaritos/` and check:
- The topbar renders correctly positioned (top-left/center/top-right within the header), using its dark-mode fallback colors (this page defines no `--bg`/`--fg`, so the topbar's `var(--fg, #ece8e0)` etc. fallbacks are what's visually rendering — confirm via `getComputedStyle` on `.site-topbar-domain` that `color` resolves to the fallback, not `rgb(0, 0, 0)` or similar failure mode).
- The gallery grid and lightbox underneath are visually unchanged (still `#0a0a0a` background) — the theme toggle does not alter them.
- Click the theme toggle: `document.documentElement.getAttribute('data-theme')` flips and persists to `localStorage`.
- Navigate to `http://localhost:8000/` afterward (same browser context/localStorage) and confirm the theme choice made on the pajaritos page is honored on the homepage too (cross-page persistence).
- No console errors on either page.

- [ ] **Step 6: Commit**

```bash
git add gallery/pajaritos/index.html gallery/pajaritos/styles.css
git commit -m "feat: wire site-topbar into the pajaritos gallery page"
```

---

### Task 4: Build `<site-footer>` in the shared file

**Files:**
- Modify: `libs/personal/site-chrome.js` (append the `SiteFooter` class)
- Test: `testing/site-footer-check.html` (throwaway, deleted at the end of this task)

**Interfaces:**
- Consumes: nothing from Tasks 1-3 (independent element in the same file).
- Produces: a global custom element `<site-footer></site-footer>` (or `<site-footer base="/index.html"></site-footer>`). The optional `base` attribute is prepended to the site-nav column's `#anchor` hrefs — empty/absent means bare `#about` etc. (correct for use on `index.html` itself), `base="/index.html"` produces `/index.html#about` etc. (correct for use on a different page, i.e. the pajaritos gallery). Renders its own bilingual text via the same `data-i18n-es`/`data-i18n-en` attribute + `html[data-lang]` CSS-hiding convention used elsewhere on `index.html`, but ships that hiding rule itself (scoped to `.site-footer-i18n` elements) so it also works correctly on pages — like the pajaritos gallery — that don't load `styles.css` and therefore don't have that rule already.

The ASCII art content below was generated programmatically (Python) to guarantee every backtick is correctly escaped for the JS template literal it lives in — do not hand-retype it; copy it verbatim.

- [ ] **Step 1: Append the `SiteFooter` element to `libs/personal/site-chrome.js`**

```js
class SiteFooter extends HTMLElement {
  connectedCallback() {
    const base = this.getAttribute('base') || '';

    this.innerHTML = `
      <style>
        site-footer {
          display: block;
          margin: 4rem 1.5rem 2rem;
        }
        site-footer .site-footer-card {
          max-width: 48rem;
          margin: 0 auto;
          border: 1px solid var(--pill-border, #3a362f);
          border-radius: 12px;
          background: var(--pill-bg, rgba(33, 31, 27, 0.45));
          padding: 2rem;
          color: var(--fg, #ece8e0);
        }
        site-footer h2 {
          margin: 0 0 0.25rem;
          font-size: 1.1rem;
        }
        site-footer .site-footer-tagline {
          margin: 0 0 1.5rem;
          color: var(--muted, #9c9488);
          font-size: 0.9rem;
        }
        site-footer .site-footer-clock {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 2rem;
          font-variant-numeric: tabular-nums;
        }
        site-footer .site-footer-clock-time {
          font-size: 1.1rem;
          font-weight: 700;
        }
        site-footer .site-footer-clock-place {
          color: var(--muted, #9c9488);
          font-size: 0.8rem;
        }
        site-footer .site-footer-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        site-footer .site-footer-columns h3 {
          margin: 0 0 0.75rem;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          color: var(--muted, #9c9488);
        }
        site-footer .site-footer-columns ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        site-footer .site-footer-columns a {
          color: var(--fg, #ece8e0);
          text-decoration: none;
          font-size: 0.9rem;
        }
        site-footer .site-footer-columns a:hover {
          text-decoration: underline;
        }
        site-footer .site-footer-legal {
          border-top: 1px solid var(--pill-border, #3a362f);
          padding-top: 1rem;
          margin-bottom: 1.5rem;
          color: var(--muted, #9c9488);
          font-size: 0.8rem;
        }
        site-footer .site-footer-ascii {
          margin: 0;
          overflow-x: auto;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: clamp(5px, 1.4vw, 10px);
          line-height: 1.15;
          color: var(--muted, #9c9488);
          white-space: pre;
        }
        html[data-lang="es"] site-footer [data-i18n-en],
        html[data-lang="en"] site-footer [data-i18n-es] {
          display: none;
        }
      </style>
      <div class="site-footer-card">
        <h2>Mario Cornejo · mariocornejo.com</h2>
        <p class="site-footer-tagline">
          <span data-i18n-es>Gestión de Negocios y Análisis de Datos</span><span data-i18n-en>Business Management &amp; Data Analytics</span>
        </p>

        <div class="site-footer-clock">
          <span class="site-footer-clock-time"></span>
          <span class="site-footer-clock-place">Lima, Perú</span>
        </div>

        <div class="site-footer-columns">
          <div>
            <h3><span data-i18n-es>SITIO</span><span data-i18n-en>SITE</span></h3>
            <ul>
              <li><a href="${base}#about"><span data-i18n-es>Sobre mí</span><span data-i18n-en>About</span></a></li>
              <li><a href="${base}#projects"><span data-i18n-es>Proyectos</span><span data-i18n-en>Projects</span></a></li>
              <li><a href="${base}#notes"><span data-i18n-es>Notas</span><span data-i18n-en>Notes</span></a></li>
              <li><a href="${base}#cv"><span data-i18n-es>Curriculum Vitae</span><span data-i18n-en>Resume</span></a></li>
              <li><a href="${base}#contact"><span data-i18n-es>Contacto</span><span data-i18n-en>Contact</span></a></li>
            </ul>
          </div>
          <div>
            <h3><span data-i18n-es>CONTACTO</span><span data-i18n-en>CONTACT</span></h3>
            <ul>
              <li><a href="https://linkedin.com/in/hicor13">LinkedIn</a></li>
              <li><a href="mailto:cornejomariob@gmail.com">Email</a></li>
              <li><a href="https://wa.me/51979001717">WhatsApp</a></li>
            </ul>
          </div>
        </div>

        <p class="site-footer-legal">© 2026 Mario Cornejo · mariocornejo.com · cornejomariob@gmail.com</p>

        <pre class="site-footer-ascii">                                     _.--""--._
                              _.-'"              \`'-._
                        _.-'"        .   .            \`'-._
                  _.-'"         .        .     .           \`'-.
            _.-="                    .        .       .        "=-._
      _.-="                 .    .         .        .      .        "=-.
.-'"     .    .    .    .          .    .        .    .      .   .       "'-.
                        _,,ww,,_        _,,ww,,_
                    ,#""    "  ""#,  ,#""    "  ""#,
                   #"  o     o    "##"  o     o    "#
                  #   .' PALM \`.   ##   .' PALM \`.   #
      ~~~~~~~~~~~#____________________________________#~~~~~~~~~~~
     ~~~~~~~~~~~~~~~   o a s i s   l a g o o n   ~~~~~~~~~~~~~~~~~~
      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                  __n_n__                          __n_n__
              .-"\`  ||  \`"-.                    .-"\`  ||  \`"-.
             ( o)==[  ]==(o )                   ( o)==[  ]==(o )
              \`""-.__||__.-""\`                   \`""-.__||__.-""\`
- - - - - - - - - - - - - - - - - I C A - - - - - - - - - - - - - - - -</pre>
      </div>
    `;

    this.initClock();
  }

  initClock() {
    const el = this.querySelector('.site-footer-clock-time');
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const tick = () => {
      el.textContent = formatter.format(new Date());
    };

    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  disconnectedCallback() {
    clearInterval(this._clockInterval);
  }
}

customElements.define('site-footer', SiteFooter);
```

- [ ] **Step 2: Write a throwaway verification harness**

```html
<!doctype html>
<html lang="es" data-lang="es">
<head>
  <meta charset="UTF-8">
  <title>site-footer check</title>
  <style>body { background: #171613; margin: 0; }</style>
</head>
<body>
  <site-footer></site-footer>
  <hr>
  <site-footer base="/index.html"></site-footer>
  <script src="/libs/personal/site-chrome.js"></script>
</body>
</html>
```

Save as `testing/site-footer-check.html`.

- [ ] **Step 3: Verify in-browser with Playwright**

Navigate to `http://localhost:8000/testing/site-footer-check.html` and check:
- Both footer instances render: card, tagline, clock, two link columns, legal line, ASCII art.
- The clock's text content changes between two reads one second apart (`el.textContent` sampled, `await` ~1100ms, sampled again, assert different) and matches `HH:MM:SS` format for `America/Lima`.
- In the first (`base`-less) instance, the "Sobre mí"/"About" link's `href` is exactly `#about`. In the second instance, it's exactly `/index.html#about`.
- The ASCII `<pre>` renders as the dune/palm/oasis/buggy scene (visually confirm via screenshot) and is legible — no stray backtick artifacts or broken lines (this specifically checks the escaping from Step 1 round-tripped correctly).
- Set `document.documentElement.dataset.lang = 'en'` and confirm the tagline and column headers switch to English text (exercises the self-shipped `html[data-lang] site-footer [data-i18n-*]` rule, since this harness page loads no other stylesheet).
- No console errors.

- [ ] **Step 4: Delete the throwaway harness**

```bash
rm testing/site-footer-check.html
```

- [ ] **Step 5: Commit**

```bash
git add libs/personal/site-chrome.js
git commit -m "feat: add self-contained site-footer custom element"
```

---

### Task 5: Wire `<site-footer>` into both pages

**Files:**
- Modify: `index.html`
- Modify: `gallery/pajaritos/index.html`

**Interfaces:**
- Consumes: `<site-footer>` from Task 4.

- [ ] **Step 1: Add `<site-footer>` to `index.html`**

Place it after `</main>`, before the existing `<script src="/libs/personal/site-chrome.js">` / `<script src="script.js">` tags:

```html
  </main>

  <site-footer></site-footer>

  <script src="/libs/personal/site-chrome.js"></script>
  <script src="script.js?v=..."></script>
```

(No `base` attribute — `index.html`'s own `#about` etc. anchors are already correct on this page.)

- [ ] **Step 2: Add `<site-footer base="/index.html">` to `gallery/pajaritos/index.html`**

Place it as the last element before the closing `</body>` (after the lightbox markup, which is already the last thing in `<body>` — confirm with `grep -n "</body>" gallery/pajaritos/index.html` and check what immediately precedes it):

```html
  <site-footer base="/index.html"></site-footer>
</body>
```

- [ ] **Step 3: Bump cache-bust query strings on `index.html`**

Bump `?v=` on `styles.css`, `script.js`, and `/libs/personal/site-chrome.js` to a new value (one past the current highest in the file).

- [ ] **Step 4: Verify in-browser with Playwright — index.html**

Navigate to `http://localhost:8000/` and check:
- The footer renders below the last content section (`#contact`), card-styled, matching the site's current theme (light/dark toggle still affects it, since it uses the same `--fg`/`--pill-bg`/etc. tokens with no page override).
- Click "Sobre mí"/"About" in the footer's site-nav column: the page smooth-scrolls to `#about`, landing clear of the sticky nav (same `scroll-margin-top`/`--nav-offset` mechanism as the top nav pills — this is a plain anchor link relying on the CSS `scroll-margin-top`, not the JS smooth-scroll handler, since the footer's links aren't `.nav-pill` elements; confirm it still lands correctly via native anchor scrolling).
- The ASCII art is legible at both a desktop width (~1280px) and a ~375px mobile width (screenshot both).
- No console errors, no regressions to the hero/nav/reveal behavior already verified in Task 2.

- [ ] **Step 5: Verify in-browser with Playwright — pajaritos**

Navigate to `http://localhost:8000/gallery/pajaritos/` and check:
- The footer renders below the photo grid.
- Click "Sobre mí"/"About" in the footer: it navigates to `/index.html#about` (a full page navigation, landing on the homepage's About section) — confirm the resulting URL and that the section is in view clear of that page's nav.
- The gallery grid and lightbox still function unchanged (click a photo, confirm the lightbox opens) — this is a regression check, since this task's only change here is appending markup before `</body>`.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html gallery/pajaritos/index.html
git commit -m "feat: wire site-footer into index.html and the pajaritos gallery page"
```
