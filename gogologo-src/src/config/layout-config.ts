// Canvas dimensions per device class, chosen at boot (game-config.ts) via
// the same 'ontouchstart' in window check every other device-aware file in
// this game already uses (input-system.ts, character-select-scene.ts).
//
// MOBILE_CONFIG is the original tall phone-tuned resolution. DESKTOP_CONFIG
// is 3:4 (480/640 = 0.75) -- closer to classic Galaga's vertical arcade
// cabinet aspect than a wide 16:9 would be.
export const MOBILE_CONFIG = { width: 480, height: 1040 };
export const DESKTOP_CONFIG = { width: 480, height: 640 };

// All of CharacterSelectScene's vertical layout constants, and Enemy's base
// fall speed, were tuned against MOBILE_CONFIG's height. REFERENCE_HEIGHT
// lets those files scale their pixel values by (actual height / this) so
// they still fit -- and enemies still take about the same time to reach the
// bottom -- on the shorter desktop canvas.
export const REFERENCE_HEIGHT = MOBILE_CONFIG.height;
