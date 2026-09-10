// garabatos/canvas.js
//
// Pure scratch-art canvas mechanic — no Firebase, no page wiring. Exposed
// via window.Garabatos so script.js can orchestrate it without a build
// step / ES module graph (this repo has neither).
window.Garabatos = window.Garabatos || {};

Garabatos.initCanvas = function initCanvas(canvasEl, brushInput) {
  const ctx = canvasEl.getContext('2d');
  const CSS_WIDTH = 640;
  const CSS_HEIGHT = 400;
  // pv1: one tunable knob for the retro pixelated look. The backing pixel
  // buffer is CSS_WIDTH/PIXEL_SCALE × CSS_HEIGHT/PIXEL_SCALE — smaller
  // than the element's displayed size — so the browser has to upscale it,
  // and #scratch-canvas's `image-rendering: pixelated` (garabatos/styles.css)
  // makes that upscale chunky instead of smoothed. Higher PIXEL_SCALE =
  // bigger/blockier pixels. 1 = back to the original crisp rendering.
  // All drawing code below still uses plain 0..640/0..400 coordinates
  // (via ctx.setTransform) regardless of this value — only the actual
  // backing resolution changes. Saved drawings export at this same low
  // resolution, so the pixelated look carries into the gallery too.
  const PIXEL_SCALE = 7;
  let gradientRef = null; // Store the gradient for scratchTo()
  let scratched = false; // True once the visitor has actually drawn something

  function paint() {
    // Fixed internal resolution scaled by devicePixelRatio for sharpness,
    // then divided by PIXEL_SCALE for the retro pixelation effect above;
    // setTransform lets every draw call below use plain 0..640/0..400
    // coordinates regardless of the actual pixel buffer size.
    const dpr = window.devicePixelRatio || 1;
    const bufferScale = dpr / PIXEL_SCALE;
    canvasEl.width = CSS_WIDTH * bufferScale;
    canvasEl.height = CSS_HEIGHT * bufferScale;
    ctx.setTransform(bufferScale, 0, 0, bufferScale, 0, 0);

    const gradient = ctx.createLinearGradient(0, 0, CSS_WIDTH, 0);
    gradient.addColorStop(0, '#ff3b30');
    gradient.addColorStop(0.17, '#ff9500');
    gradient.addColorStop(0.34, '#ffcc00');
    gradient.addColorStop(0.5, '#34c759');
    gradient.addColorStop(0.67, '#0a84ff');
    gradient.addColorStop(0.84, '#5856d6');
    gradient.addColorStop(1, '#af52de');

    gradientRef = gradient; // Store for use in scratchTo

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);

    scratched = false;
  }

  function canvasPoint(event) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (CSS_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (CSS_HEIGHT / rect.height),
    };
  }

  let scratching = false;
  let lastPoint = null;

  function scratchTo(point) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = gradientRef;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Number(brushInput.value) || 16;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
    scratched = true;
  }

  canvasEl.addEventListener('pointerdown', (event) => {
    scratching = true;
    lastPoint = canvasPoint(event);
    scratchTo(lastPoint); // draws a dot for a tap with no drag
    canvasEl.setPointerCapture(event.pointerId);
  });

  canvasEl.addEventListener('pointermove', (event) => {
    if (!scratching) return;
    scratchTo(canvasPoint(event));
  });

  const endScratch = () => {
    scratching = false;
    lastPoint = null;
  };
  canvasEl.addEventListener('pointerup', endScratch);
  canvasEl.addEventListener('pointercancel', endScratch);

  paint();

  return {
    clear: paint,
    hasScratched: () => scratched,
    exportPNG: () =>
      new Promise((resolve, reject) => {
        canvasEl.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob returned null'));
        }, 'image/png');
      }),
  };
};
