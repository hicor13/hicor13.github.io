// gallery/garabatos/script.js
//
// Fetches every saved drawing, scores each one's "density" (how much got
// scratched — see mosaic-engine.js), and asks the engine to pack them into
// a tile layout tracing the word GARABATOS. Rendering the actual tile DOM
// (with the black-fill blend effect) happens here too, added in a follow-up
// pass — this version establishes fetch + empty/error states.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const MESSAGES = {
    empty: {
      es: 'Todavía no hay garabatos guardados.',
      en: 'No doodles saved yet.',
    },
    error: {
      es: 'No se pudo cargar el mosaico.',
      en: "Couldn't load the mosaic.",
    },
  };

  function downloadUrlFor(storagePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
  }

  function renderStatus(gridEl, statusEl, key) {
    gridEl.innerHTML = '';
    const msgs = MESSAGES[key];
    statusEl.innerHTML =
      `<span data-i18n-es>${msgs.es}</span><span data-i18n-en>${msgs.en}</span>`;
  }

  async function init() {
    const gridEl = document.getElementById('mosaic-grid');
    const statusEl = document.getElementById('mosaic-status');
    if (!gridEl || !statusEl) return;

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let rows;
    try {
      const { data, error } = await client
        .from('drawings')
        .select('name, storage_path, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data;
    } catch (error) {
      console.error('Garabatos mosaic: failed to fetch drawings:', error);
      renderStatus(gridEl, statusEl, 'error');
      return;
    }

    if (rows.length === 0) {
      renderStatus(gridEl, statusEl, 'empty');
      return;
    }

    // Tile rendering wired up in Task 3 — for now, prove the fetch worked.
    statusEl.textContent = '';
    window.__mosaicFetchedRows = rows; // read by Task 2's verification step only
  }

  document.addEventListener('DOMContentLoaded', init);
})();
