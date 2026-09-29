// garabatos/script.js
//
// Orchestrates canvas.js (pure scratch mechanic) and gallery.js (Supabase
// glue) with the page's own DOM elements, button states, and bilingual
// status messages.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const SAVE_THROTTLE_MS = 30000;
  const THROTTLE_KEY = 'garabatos-last-save';

  const MESSAGES = {
    es: {
      saved: '¡Guardado!',
      throttled: 'Espera un momento antes de guardar otro dibujo.',
      error: 'No se pudo guardar. Intenta de nuevo.',
      blank: 'Dibuja algo primero.',
    },
    en: {
      saved: 'Saved!',
      throttled: 'Wait a moment before saving another drawing.',
      error: "Couldn't save. Please try again.",
      blank: 'Draw something first.',
    },
  };

  const PLACEHOLDERS = {
    es: 'Tu nombre',
    en: 'Your name',
  };

  function currentLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'es';
  }

  function defaultArtistName() {
    return currentLang() === 'en' ? 'Anonymous' : 'Anónimo';
  }

  // The page's ES/EN toggle (garabatos/styles.css's
  // [data-i18n-es]/[data-i18n-en] rule) only affects visible text
  // content via CSS — it can't reach an <input>'s placeholder attribute.
  // Watching documentElement's lang/data-lang keeps this one attribute
  // in sync without needing its own click listener on the toggle button
  // (which lives inside <site-topbar>, a separate custom element).
  function watchPlaceholderLang(nameInput) {
    const sync = () => {
      nameInput.placeholder = PLACEHOLDERS[currentLang()];
    };
    sync();
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'data-lang'],
    });
  }

  // #retro-wordart lives inside .garabatos-header and uses plain CSS
  // position:sticky — no JS. There WAS a JS hybrid here that switched it
  // to position:fixed once the header ran out of room, to keep it
  // "stuck forever" like a persistent header. Removed after finding a
  // 4th distinct bug in that approach, each in a different place (a
  // mistimed IntersectionObserver, a wrong release-point formula, a
  // rotate(-4deg) transform offsetting the measured target, and finally
  // the real one: switching position:sticky -> position:fixed takes the
  // badge out of document flow, so .garabatos-header instantly collapses
  // by the badge's own height — confirmed via getBoundingClientRect():
  // the canvas below jumped from top:156px to top:68px in a single
  // scroll step, an 88px snap of the ENTIRE rest of the page, not just
  // the badge). Four fixes each surfacing a new problem elsewhere is the
  // signal to stop patching and simplify, not attempt a fifth. Plain
  // sticky can't produce a jump like this — there's no discrete state
  // change for anything to snap between — at the cost of the badge
  // eventually scrolling away with the header instead of staying pinned
  // through the whole page.

  // localStorage can throw (private browsing, strict site-data settings,
  // storage quota). The throttle is a nice-to-have, not core functionality,
  // so failures here must never block or falsely fail a save.
  function getLastSaveTime() {
    try {
      return Number(localStorage.getItem(THROTTLE_KEY) || 0);
    } catch (error) {
      return 0;
    }
  }

  function setLastSaveTime() {
    try {
      localStorage.setItem(THROTTLE_KEY, String(Date.now()));
    } catch (error) {
      // Ignore — the drawing was already saved successfully; a throttle
      // write failure must not be treated as a save failure.
    }
  }

  function init() {
    const canvasEl = document.getElementById('scratch-canvas');
    const brushInput = document.getElementById('brush-size');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const nameInput = document.getElementById('artist-name');
    const statusEl = document.getElementById('save-status');
    const gridEl = document.getElementById('gallery-grid');
    if (!canvasEl || !brushInput || !clearBtn || !saveBtn || !nameInput || !statusEl || !gridEl) return;

    const painter = Garabatos.initCanvas(canvasEl, brushInput);
    watchPlaceholderLang(nameInput);

    clearBtn.addEventListener('click', () => {
      painter.clear();
      statusEl.textContent = '';
    });

    Garabatos.gallery.init(SUPABASE_URL, SUPABASE_ANON_KEY, gridEl).catch((error) => {
      console.error('Garabatos gallery failed to load:', error);
      Garabatos.gallery.renderError(gridEl);
    });

    saveBtn.addEventListener('click', async () => {
      const msgs = MESSAGES[currentLang()];
      const lastSave = getLastSaveTime();
      if (Date.now() - lastSave < SAVE_THROTTLE_MS) {
        statusEl.textContent = msgs.throttled;
        return;
      }

      if (!painter.hasScratched()) {
        statusEl.textContent = msgs.blank;
        return;
      }

      saveBtn.disabled = true;
      try {
        const blob = await painter.exportPNG();
        const name = nameInput.value.trim() || defaultArtistName();
        await Garabatos.gallery.save(blob, name);
        setLastSaveTime();
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
})();
