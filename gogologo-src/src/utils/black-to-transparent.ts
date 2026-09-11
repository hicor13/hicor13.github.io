// Converts near-black pixels (matching the blank-canvas fill color used
// throughout the Garabatos family, #111111 — see garabatos/canvas.js and
// gallery/garabatos/mosaic-engine.js elsewhere in this repo) to fully
// transparent, so a drawing exported from the scratch board reads as a
// sprite silhouette instead of a black box. Pure canvas function, no
// Phaser dependency — testable with any loaded image.
const BLANK_R = 0x11;
const BLANK_G = 0x11;
const BLANK_B = 0x11;

export function applyBlackTransparency(
  image: HTMLImageElement,
  threshold: number = 40
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('applyBlackTransparency: 2D context unavailable');

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = pixels[i] - BLANK_R;
    const dg = pixels[i + 1] - BLANK_G;
    const db = pixels[i + 2] - BLANK_B;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < threshold) {
      pixels[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
