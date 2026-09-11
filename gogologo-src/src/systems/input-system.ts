import Phaser from 'phaser';

export interface InputController {
  getTargetX(currentX: number): number;
  isFiring(): boolean;
}

const KEYBOARD_MOVE_SPEED = 300; // pixels per second

export function createInputController(scene: Phaser.Scene): InputController {
  let targetX: number | null = null;

  const cursors = scene.input.keyboard!.createCursorKeys();
  const keyA = scene.input.keyboard!.addKey('A');
  const keyD = scene.input.keyboard!.addKey('D');
  const keySpace = scene.input.keyboard!.addKey('SPACE');

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
      return keySpace.isDown;
    },
  };
}
