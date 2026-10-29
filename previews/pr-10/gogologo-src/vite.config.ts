import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gogologo/',
  build: {
    outDir: '../gogologo',
    emptyOutDir: true,
  },
});
