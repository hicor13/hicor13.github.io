import Phaser from 'phaser';
import { fetchDrawingPool, loadTransparentTexture } from '../systems/garabatos-sprites';

const DRAWING_POOL_SIZE = 12;
const PLACEHOLDER_TEXTURE_KEY = 'placeholder-ship';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  async create(): Promise<void> {
    const loadingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const textureKeys: string[] = [];
    const pool = await fetchDrawingPool(DRAWING_POOL_SIZE);

    for (let i = 0; i < pool.length; i++) {
      const key = `drawing-${i}`;
      const ok = await loadTransparentTexture(this, key, pool[i].url);
      if (ok) textureKeys.push(key);
    }

    if (textureKeys.length === 0) {
      // Supabase down, empty DB, or every fetch failed — never show a
      // silent blank/broken game, same defensive pattern as every other
      // Garabatos-family page in this repo.
      const graphics = this.add.graphics();
      graphics.fillStyle(0xd91023, 1);
      graphics.fillTriangle(16, 0, 0, 32, 32, 32);
      graphics.generateTexture(PLACEHOLDER_TEXTURE_KEY, 32, 32);
      graphics.destroy();
      textureKeys.push(PLACEHOLDER_TEXTURE_KEY);
    }

    this.registry.set('drawingTextureKeys', textureKeys);
    loadingText.destroy();
    this.scene.start('MenuScene');
  }
}
