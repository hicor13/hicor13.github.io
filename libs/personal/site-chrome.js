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
        site-topbar .site-topbar-lang-es,
        site-topbar .site-topbar-lang-en {
          font-weight: 400;
        }
        site-topbar .site-topbar-lang[data-lang="es"] .site-topbar-lang-es,
        site-topbar .site-topbar-lang[data-lang="en"] .site-topbar-lang-en {
          font-weight: 700;
          color: var(--fg, #ece8e0);
        }
        /* Static SVGs (stroke: currentColor) instead of the sun/moon emoji
           glyphs — those render as whatever the OS's own emoji set looks
           like (inconsistent across devices) instead of a fixed icon.
           Recolored the same way the text toggles above are: dim by
           default, --fg for whichever theme is currently active. */
        site-topbar .site-topbar-theme-light,
        site-topbar .site-topbar-theme-dark {
          display: inline-flex;
          color: var(--muted, #9c9488);
        }
        site-topbar .site-topbar-theme-light svg,
        site-topbar .site-topbar-theme-dark svg {
          width: 1rem;
          height: 1rem;
        }
        site-topbar .site-topbar-theme[data-theme="light"] .site-topbar-theme-light,
        site-topbar .site-topbar-theme[data-theme="dark"] .site-topbar-theme-dark {
          color: var(--fg, #ece8e0);
        }
      </style>
      <div class="site-topbar-row">
        <button class="site-topbar-theme" type="button" aria-label="Cambiar tema / Switch theme">
          <span class="site-topbar-theme-light">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>
          </span>
          /
          <span class="site-topbar-theme-dark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
            </svg>
          </span>
        </button>
        <a class="site-topbar-domain" href="https://mariocornejo.com">mariocornejo.com</a>
        <button class="site-topbar-lang" type="button" aria-label="Cambiar idioma / Switch language">
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

class SiteFooter extends HTMLElement {
  connectedCallback() {
    // Optional "base" attribute prefixes the site-nav column's #anchor hrefs — empty on
    // the page these anchors actually live on (index.html), or e.g. "/index.html" when
    // <site-footer> is used on a different page (the pajaritos gallery) so links resolve
    // there instead of to a same-page anchor that doesn't exist.
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
          /* Opaque, not translucent like .nav-pill — this card sits far
             down the page, well past the hero, but .parallax-bg is
             position:fixed and covers the whole page including here.
             A translucent background let its drifting blobs bleed
             through unevenly (visible seam wherever a blob's gradient
             edge landed); --footer-bg is a solid color pre-blended to
             match the translucent look on a plain background, so it's
             immune to whatever's fixed behind it at any scroll position. */
          background: var(--footer-bg, #1c1a17);
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
          margin-top: 0;
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
        site-footer [data-i18n-en] {
          display: none;
        }
        html[data-lang="en"] site-footer [data-i18n-es] {
          display: none;
        }
        html[data-lang="en"] site-footer [data-i18n-en] {
          display: inline;
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

        <pre class="site-footer-ascii" aria-hidden="true">                                     _.--""--._
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
