// gallery/garabatos-custom/script.js
//
// Same engine, same fetch/scoring/render flow as gallery/garabatos/ — the
// only difference is the mask source (see the TODO below). Kept as a full
// copy rather than a shared module because the two pages are meant to
// diverge here: this one gets a custom target-image workflow built on top
// later, and that shouldn't risk changing gallery/garabatos/'s behavior.
(function () {
  const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

  const COLS = 52;
  const ROWS = 14;

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

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  function styleForDensity(score) {
    const clamped = Math.max(0, Math.min(1, score));
    return {
      scale: (0.6 + clamped * 0.5).toFixed(3),
      opacity: (0.6 + clamped * 0.4).toFixed(3),
      noiseDuration: (3 + clamped * 4).toFixed(2) + 's',
      noiseOpacity: (0.75 - clamped * 0.35).toFixed(3),
    };
  }

  function renderTile(tile) {
    const figure = document.createElement('figure');
    figure.className = 'mosaic-tile';
    figure.style.gridColumn = String(tile.col + 1);
    figure.style.gridRow = String(tile.row + 1);

    const style = styleForDensity(tile.drawing.density);
    figure.style.setProperty('--tile-scale', style.scale);
    figure.style.setProperty('--tile-opacity', style.opacity);
    figure.style.setProperty('--noise-duration', style.noiseDuration);
    figure.style.setProperty('--noise-opacity', style.noiseOpacity);

    const noise = document.createElement('div');
    noise.className = 'mosaic-noise';

    const img = document.createElement('img');
    img.src = downloadUrlFor(tile.drawing.storage_path);
    img.alt = tile.drawing.name;
    img.loading = 'lazy';

    figure.appendChild(noise);
    figure.appendChild(img);
    return figure;
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

    statusEl.textContent = '';

    const densityCache = new Map();
    const drawings = [];
    for (const row of rows) {
      if (!densityCache.has(row.storage_path)) {
        try {
          const img = await loadImage(downloadUrlFor(row.storage_path));
          densityCache.set(row.storage_path, Garabatos.mosaic.densityScore(img));
        } catch (error) {
          console.error('Garabatos mosaic: failed to score drawing:', error);
          densityCache.set(row.storage_path, 0.5);
        }
      }
      drawings.push({
        name: row.name,
        storage_path: row.storage_path,
        density: densityCache.get(row.storage_path),
      });
    }

    // TODO: swap this for your own target image, e.g.:
    // const targetImg = await loadImage('/gallery/garabatos-custom/target.png');
    // const mask = Garabatos.mosaic.buildMask(targetImg, COLS, ROWS);
    const mask = Garabatos.mosaic.buildMask('GARABATOS', COLS, ROWS);
    const tiles = Garabatos.mosaic.packTiles(mask, drawings);

    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
    gridEl.style.aspectRatio = `${COLS} / ${ROWS}`;

    tiles.forEach((tile) => gridEl.appendChild(renderTile(tile)));
    window.__mosaicTileCount = tiles.length; // read by verification step only
  }

  document.addEventListener('DOMContentLoaded', init);
})();
