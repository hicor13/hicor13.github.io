import Phaser from 'phaser';

export interface InputController {
  getTargetX(currentX: number): number;
  isFiring(): boolean;
}

const KEYBOARD_MOVE_SPEED = 300; // pixels per second
const FIRE_BUTTON_RADIUS = 30;
const FIRE_BUTTON_MARGIN = 50;

export function createInputController(scene: Phaser.Scene): InputController {
  let targetX: number | null = null;
  let touchFiring = false;

  const cursors = scene.input.keyboard!.createCursorKeys();
  const keyA = scene.input.keyboard!.addKey('A');
  const keyD = scene.input.keyboard!.addKey('D');
  const keySpace = scene.input.keyboard!.addKey('SPACE');

  const isTouchCapable = 'ontouchstart' in window;
  if (isTouchCapable) {
    const dragZone = scene.add
      .zone(0, 0, scene.scale.width, scene.scale.height)
      .setOrigin(0, 0)
      .setInteractive();

    const followPointer = (pointer: Phaser.Input.Pointer): void => {
      targetX = pointer.x;
    };
    dragZone.on('pointerdown', followPointer);
    dragZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) followPointer(pointer);
    });

    // Added after dragZone, so it renders on top and Phaser's input
    // plugin gives it hit-test priority over the zone beneath it at the
    // same screen position — a tap here is read as "fire", not a drag.
    const fireButton = scene.add
      .circle(
        scene.scale.width - FIRE_BUTTON_MARGIN,
        scene.scale.height - FIRE_BUTTON_MARGIN,
        FIRE_BUTTON_RADIUS,
        0xd91023,
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
      if (cursors.left.isDown || keyA.isDown) dx -= KEYBOARD_MOVE_SPEED * dt;
      if (cursors.right.isDown || keyD.isDown) dx += KEYBOARD_MOVE_SPEED * dt;
      targetX = base + dx;
      return targetX;
    },
    isFiring(): boolean {
      return keySpace.isDown || touchFiring;
    },
  };
}
