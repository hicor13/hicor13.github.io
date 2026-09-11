// Fetches drawings from the same Supabase table every other Garabatos
// page in this repo uses, and converts each one into a Phaser texture
// with its black background made transparent (see black-to-transparent.ts)
// so it reads as a sprite silhouette. No Phaser Scene dependency in the
// fetch itself — only loadTransparentTexture needs one, to register the
// result as a usable texture.
import Phaser from 'phaser';
import { createClient } from '@supabase/supabase-js';
import { applyBlackTransparency } from '../utils/black-to-transparent';

const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

export interface DrawingRef {
  name: string;
  storagePath: string;
  url: string;
}

function downloadUrlFor(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/drawings/${storagePath}`;
}

// Cycles through the fetched rows (modulo) to always return exactly
// `count` refs, even if the database currently has fewer real drawings
// than that — same tolerant-of-a-small-pool approach as this repo's
// gallery/garabatos/ mosaic wall.
export async function fetchDrawingPool(count: number): Promise<DrawingRef[]> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client
    .from('drawings')
    .select('name, storage_path, created_at')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    return [];
  }

  const pool: DrawingRef[] = [];
  for (let i = 0; i < count; i++) {
    const row = data[i % data.length];
    pool.push({ name: row.name, storagePath: row.storage_path, url: downloadUrlFor(row.storage_path) });
  }
  return pool;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

// Returns false (never throws) on any failure — the caller falls back to
// a generated placeholder texture rather than breaking the game.
export async function loadTransparentTexture(
  scene: Phaser.Scene,
  key: string,
  url: string
): Promise<boolean> {
  try {
    const img = await loadImage(url);
    const canvas = applyBlackTransparency(img, 40);
    scene.textures.addCanvas(key, canvas);
    return true;
  } catch (error) {
    console.error(`garabatos-sprites: failed to load texture "${key}":`, error);
    return false;
  }
}
