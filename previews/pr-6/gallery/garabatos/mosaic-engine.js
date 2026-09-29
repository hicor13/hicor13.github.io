// gallery/garabatos/mosaic-engine.js
//
// Pure, DOM-adjacent (canvas only, no page elements) mosaic logic shared by
// gallery/garabatos/ and gallery/garabatos-custom/. No Supabase, no fetch,
// no rendering of the actual tile DOM — just: what shape should the wall
// take (buildMask), how "finished" is one drawing (densityScore), and
// which drawing goes in which cell (packTiles).
window.Garabatos = window.Garabatos || {};

Garabatos.mosaic = (function () {
  // Same blank-canvas color as canvas.js's paint() fill — a drawing that's
  // never been touched is entirely this color.
  const BLANK_R = 0x11;
  const BLANK_G = 0x11;
  const BLANK_B = 0x11;
  const SCRATCH_DISTANCE_THRESHOLD = 40;

  function buildMask(source, cols, rows) {
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cols, rows);
    ctx.fillStyle = '#ffffff';

    if (typeof source === 'string') {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      let fontSize = rows;
      const fontStack = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
      ctx.font = `bold ${fontSize}px ${fontStack}`;
      while (ctx.measureText(source).width > cols * 0.94 && fontSize > 1) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px ${fontStack}`;
      }
      ctx.fillText(source, cols / 2, rows / 2 + 1);
    } else {
      ctx.drawImage(source, 0, 0, cols, rows);
    }

    const pixels = ctx.getImageData(0, 0, cols, rows).data;
    const mask = [];
    for (let row = 0; row < rows; row++) {
      const rowCells = [];
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 4;
        rowCells.push(pixels[idx] > 128);
      }
      mask.push(rowCells);
    }
    return mask;
  }

  function densityScore(imgEl) {
    const width = 64;
    const height = 40;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const total = width * height;
    let scratched = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const dr = pixels[i] - BLANK_R;
      const dg = pixels[i + 1] - BLANK_G;
      const db = pixels[i + 2] - BLANK_B;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance > SCRATCH_DISTANCE_THRESHOLD) scratched++;
    }
    return scratched / total;
  }

  function packTiles(mask, drawings) {
    const cells = [];
    for (let row = 0; row < mask.length; row++) {
      for (let col = 0; col < mask[row].length; col++) {
        if (mask[row][col]) cells.push({ row, col });
      }
    }
    if (drawings.length === 0 || cells.length === 0) return [];

    const shuffled = drawings.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    const placed = new Map();
    const keyFor = (row, col) => `${row},${col}`;
    const neighborsOf = (row, col) => [
      placed.get(keyFor(row - 1, col)),
      placed.get(keyFor(row + 1, col)),
      placed.get(keyFor(row, col - 1)),
      placed.get(keyFor(row, col + 1)),
    ].filter((d) => d !== undefined);

    const tiles = [];
    let cursor = 0;
    cells.forEach(({ row, col }) => {
      let candidate = shuffled[cursor % shuffled.length];
      if (shuffled.length > 1) {
        const neighbors = neighborsOf(row, col);
        let attempts = 0;
        while (neighbors.indexOf(candidate) !== -1 && attempts < shuffled.length) {
          cursor++;
          candidate = shuffled[cursor % shuffled.length];
          attempts++;
        }
      }
      cursor++;
      placed.set(keyFor(row, col), candidate);
      tiles.push({ row, col, drawing: candidate });
    });

    return tiles;
  }

  return { buildMask, densityScore, packTiles };
})();
