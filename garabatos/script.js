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

  // #retro-wordart lives inside .garabatos-header and uses position:sticky
  // there — sticky's "stuck" range is bounded by its own parent's box.
  //
  // Root cause of a visible jump (found via 1px-step measurement, not
  // guessed): CSS doesn't hold the badge at a clean top:1rem until some
  // sharp release point — once the header starts running low on room
  // below it, sticky continuously SLIDES it up (1:1 with scroll), well
  // before the header's bottom edge. Two earlier attempts to predict that
  // release point in advance (an IntersectionObserver on an end-of-header
  // sentinel, then a formula computed from header/margin/height
  // measurements) each fired at the wrong scrollY, so switching to
  // .retro-wordart--pinned (position:fixed, hardcoded top:1rem) snapped
  // the badge from wherever CSS had already slid it to (confirmed as far
  // as top:-4.4px, i.e. partly above the viewport) to the fixed 16px
  // target — a real ~15px jump every time, not a timing fluke.
  //
  // Fix: stop predicting, measure instead. Every scroll, read the
  // badge's actual live position (getBoundingClientRect().top) while
  // still in sticky mode; the instant CSS's own value would reach the
  // pinned state's own rendered position, switch to pinned right then —
  // by definition the same position CSS just had it at, so there's
  // nothing to jump. Unpinning (scrolling back up) reverses at the same
  // scrollY pinning engaged at, which is exact by construction rather
  // than a second formula to get wrong.
  //
  // The pinned target itself is MEASURED, not assumed to be the CSS
  // top:1rem (16px) value — a second bug, found the same way as the
  // first: .retro-wordart has its own rotate(-4deg) transform, which
  // shifts getBoundingClientRect()'s rendered box away from the raw CSS
  // top value (confirmed: CSS said top:16px, actual rendered top was
  // ~10.57px). Using 16 as the comparison threshold made the pin engage
  // too early, since the sticky element's natural resting position
  // never actually reaches 16 in the first place. Briefly applying
  // .retro-wordart--pinned once at init to measure its real rendered
  // top sidesteps this entirely — correct regardless of whatever the
  // rotation/transform happens to be, no angle math needed.
  function initWordartPin() {
    const wordart = document.getElementById('retro-wordart');
    if (!wordart) return;

    wordart.classList.add('retro-wordart--pinned');
    const PINNED_TOP_PX = wordart.getBoundingClientRect().top;
    wordart.classList.remove('retro-wordart--pinned');

    let pinEngageScrollY = null;

    function onScroll() {
      const pinned = wordart.classList.contains('retro-wordart--pinned');
      if (!pinned) {
        if (wordart.getBoundingClientRect().top <= PINNED_TOP_PX) {
          pinEngageScrollY = window.scrollY;
          wordart.classList.add('retro-wordart--pinned');
        }
      } else if (window.scrollY < pinEngageScrollY) {
        wordart.classList.remove('retro-wordart--pinned');
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

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
    initWordartPin();

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
