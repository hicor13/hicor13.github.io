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
  // CSS starts pushing it back out of the stuck position as soon as the
  // header runs low on remaining room below it — NOT a clean release
  // right as the header ends; it starts sliding up (and off-screen, well
  // before the header's actual bottom edge) earlier than that. An
  // IntersectionObserver on a sentinel at the header's end fires too
  // late to catch this — confirmed by scrolling in 10px steps and
  // watching the badge go to top:-65px (fully invisible) before the
  // sentinel-based pin ever engaged.
  //
  // Real fix: compute the exact scrollY where sticky runs out of room —
  // (header's bottom, in document coordinates) minus (the stuck offset)
  // minus (the badge's own height) — from actual measurements, matching
  // CSS's own release condition instead of guessing at it. Comparing
  // window.scrollY against that threshold on every scroll switches to
  // .retro-wordart--pinned (position:fixed, same visual spot) at exactly
  // the moment CSS would otherwise start moving it away, so there's no
  // gap where it goes missing. Measured once on load and on resize —
  // deliberately NOT while scrolling, since toggling pinned changes
  // whether the badge occupies flow space (position:fixed removes it),
  // which would shift the header's own measured height and create a
  // feedback loop if re-measured mid-scroll.
  function initWordartPin() {
    const wordart = document.getElementById('retro-wordart');
    const header = document.querySelector('.garabatos-header');
    if (!wordart || !header) return;

    const STUCK_TOP_PX = 16; // matches .retro-wordart's CSS top:1rem
    const SAFETY_BUFFER_PX = 8; // triggers pin slightly early rather than risk being late again
    let pinThreshold = 0;

    function measure() {
      const wasPinned = wordart.classList.contains('retro-wordart--pinned');
      if (wasPinned) wordart.classList.remove('retro-wordart--pinned');
      const headerBottomDocY = header.getBoundingClientRect().bottom + window.scrollY;
      const wordartHeight = wordart.getBoundingClientRect().height;
      // getBoundingClientRect() excludes margin — sticky's release condition
      // is about the element's full margin box staying within the parent,
      // so its own margin-bottom (the space it needs below itself) has to
      // be subtracted too. First attempt at this formula (without this
      // term) triggered ~30px too late, empirically confirmed by scrolling
      // in 10px steps and watching exactly where the badge went offscreen
      // versus where .retro-wordart--pinned actually engaged.
      const marginBottom = parseFloat(getComputedStyle(wordart).marginBottom) || 0;
      pinThreshold = headerBottomDocY - STUCK_TOP_PX - wordartHeight - marginBottom - SAFETY_BUFFER_PX;
      if (wasPinned) wordart.classList.add('retro-wordart--pinned');
    }

    function onScroll() {
      wordart.classList.toggle('retro-wordart--pinned', window.scrollY >= pinThreshold);
    }

    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
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
