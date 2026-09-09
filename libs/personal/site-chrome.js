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
