import Phaser from 'phaser';

// localStorage-based persistence for visual settings, same defensive
// try/catch pattern as save-manager.ts's best-score persistence -- private
// browsing or storage quota errors must never block gameplay.
const PIXELATION_ENABLED_KEY = 'gogologo-pixelation-enabled';

// How chunky the retro pixelate post-FX looks. Small enough to stay
// readable, big enough to actually read as a deliberate retro filter.
export const PIXELATE_AMOUNT = 4;

export function getPixelationEnabled(): boolean {
  try {
    return localStorage.getItem(PIXELATION_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPixelationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PIXELATION_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore -- persistence is a nice-to-have, not core functionality.
  }
}

// Applies the persisted pixelation setting to a freshly-created scene
// camera. Each scene gets its own Camera instance, so this must be called
// again from every scene's create() -- post-FX controllers don't carry
// over a scene.start() transition. Returns the FX controller (so a caller
// that wants to toggle it later can hang onto the reference), or null when
// pixelation is currently off.
export function applyPixelationSetting(camera: Phaser.Cameras.Scene2D.Camera): Phaser.FX.Pixelate | null {
  if (!getPixelationEnabled()) return null;
  return camera.postFX.addPixelate(PIXELATE_AMOUNT);
}
