import Phaser from 'phaser';
import { ACCENT_COLOR } from '../config/visual-config';
import { PLAYER_CONFIG } from '../config/entity-config';

export interface InputController {
  getTargetX(currentX: number): number;
  isFiring(): boolean;
}

const FIRE_BUTTON_RADIUS = 40;
const FIRE_BUTTON_MARGIN_X = 50;
const FIRE_BUTTON_MARGIN_Y = 70;
// Height of the bottom strip reserved exclusively for the fire button, so it
// never overlaps the drag-to-move zone above it. Keeps a drag whose path
// crosses toward the bottom-right corner from being intercepted as a tap.
export const CONTROL_ZONE_HEIGHT = 140;
// Width of the movement strip carved out of the bottom control zone, to the
// left of the fire button (button spans roughly [width-90, width-10] at its
// current radius/margin — 100 leaves a clear gap). Narrower than the full
// canvas width, so this strip uses relative drag (trackpad-style) instead of
// the upper drag zone's absolute pointer-to-position mapping — a raw 1:1
// mapping here could never reach the screen's right edge.
const BOTTOM_STRIP_MARGIN = 100;
// Trackpad-style drag is intentionally slower than a direct positional
// mapping — a full-width swipe on this narrower strip shouldn't fling the
// ship all the way across the screen.
const BOTTOM_STRIP_DRAG_SENSITIVITY = 0.6;

export function createInputController(scene: Phaser.Scene): InputController {
  let targetX: number | null = null;
  let touchFiring = false;
  let bottomStripLastX: number | null = null;

  const cursors = scene.input.keyboard!.createCursorKeys();
  const keyA = scene.input.keyboard!.addKey('A');
  const keyD = scene.input.keyboard!.addKey('D');
  const keySpace = scene.input.keyboard!.addKey('SPACE');

  const isTouchCapable = 'ontouchstart' in window;
  if (isTouchCapable) {
    const dragZone = scene.add
      .zone(0, 0, scene.scale.width, scene.scale.height - CONTROL_ZONE_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive();

    const followPointer = (pointer: Phaser.Input.Pointer): void => {
      targetX = pointer.x;
    };
    dragZone.on('pointerdown', followPointer);
    dragZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) followPointer(pointer);
    });

    const bottomStripZone = scene.add
      .zone(
        0,
        scene.scale.height - CONTROL_ZONE_HEIGHT,
        scene.scale.width - BOTTOM_STRIP_MARGIN,
        CONTROL_ZONE_HEIGHT
      )
      .setOrigin(0, 0)
      .setInteractive();

    bottomStripZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      bottomStripLastX = pointer.x;
    });
    bottomStripZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && bottomStripLastX !== null && targetX !== null) {
        targetX += (pointer.x - bottomStripLastX) * BOTTOM_STRIP_DRAG_SENSITIVITY;
      }
      bottomStripLastX = pointer.x;
    });
    bottomStripZone.on('pointerup', () => {
      bottomStripLastX = null;
    });
    bottomStripZone.on('pointerout', () => {
      bottomStripLastX = null;
    });

    // Added after dragZone, so it renders on top and Phaser's input
    // plugin gives it hit-test priority over the zone beneath it at the
    // same screen position — a tap here is read as "fire", not a drag.
    const fireButton = scene.add
      .circle(
        scene.scale.width - FIRE_BUTTON_MARGIN_X,
        scene.scale.height - FIRE_BUTTON_MARGIN_Y,
        FIRE_BUTTON_RADIUS,
        ACCENT_COLOR,
        0.6
      )
      .setInteractive();
    fireButton.on('pointerdown', () => {
      touchFiring = true;
    });
    fireButton.on('pointerup', () => {
      touchFiring = false;
    });
    fireButton.on('pointerout', () => {
      touchFiring = false;
    });
  }

  return {
    getTargetX(currentX: number): number {
      const base = targetX === null ? currentX : targetX;
      const dt = scene.game.loop.delta / 1000;
      let dx = 0;
      if (cursors.left.isDown || keyA.isDown) dx -= PLAYER_CONFIG.moveSpeed * dt;
      if (cursors.right.isDown || keyD.isDown) dx += PLAYER_CONFIG.moveSpeed * dt;
      targetX = base + dx;
      return targetX;
    },
    isFiring(): boolean {
      return keySpace.isDown || touchFiring;
    },
  };
}
