// gallery/garabatos/script.js
//
// Fetches every saved drawing, scores each unique one's "density" (how
// much got scratched — mosaic-engine.js's densityScore), asks the engine
// to pack them into a tile layout tracing the word GARABATOS, then renders
// each tile as a two-layer <figure>: an animated noise div behind, the
// drawing on top with mix-blend-mode:lighten so black (unscratched) pixels
// let the noise glow through while the drawing's own bright strokes stay
// dominant. Density also drives each tile's size/opacity and the noise
// layer's speed/opacity via inline CSS custom properties.
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
