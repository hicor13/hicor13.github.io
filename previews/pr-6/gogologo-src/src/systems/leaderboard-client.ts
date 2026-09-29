// DB-backed high-score leaderboard, on the same Supabase project + anon key
// garabatos-sprites.ts already uses elsewhere in this repo. The `leaderboard`
// table doesn't exist until docs/superpowers/specs/2026-09-17-gogologo-
// leaderboard-schema.sql is run manually in the Supabase SQL editor (the
// anon key has no DDL rights) -- until then every call here fails and
// resolves to false/[] rather than throwing, so the game never breaks or
// blocks on a missing table. Same "never show a silent blank/broken
// screen, always degrade gracefully" pattern as preload-scene.ts's
// placeholder-texture fallback.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvysswkivofvscfqysnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eXNzd2tpdm9mdnNjZnF5c25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDUwMjYsImV4cCI6MjEwNDU4MTAyNn0.leXcOO5lH1D8DQeyhzQmBYPstJuCRhuDxJmJgBwQa70';

// Classic arcade high-score-entry cap -- matches the schema's
// leaderboard_name_length check constraint (1-4 chars).
export const LEADERBOARD_NAME_MAX_LENGTH = 4;

export interface LeaderboardEntry {
  name: string;
  score: number;
}

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function submitScore(name: string, score: number): Promise<boolean> {
  const trimmed = name.trim().toUpperCase().slice(0, LEADERBOARD_NAME_MAX_LENGTH);
  if (trimmed.length === 0) return false;

  try {
    const { error } = await client()
      .from('leaderboard')
      .insert({ name: trimmed, score: Math.max(0, Math.floor(score)) });
    if (error) {
      console.error('leaderboard-client: submitScore failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('leaderboard-client: unexpected error in submitScore:', error);
    return false;
  }
}

export async function fetchTopScores(limit: number): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await client()
      .from('leaderboard')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(limit);

    if (error || !data) {
      if (error) console.error('leaderboard-client: fetchTopScores failed:', error);
      return [];
    }
    return data as LeaderboardEntry[];
  } catch (error) {
    console.error('leaderboard-client: unexpected error in fetchTopScores:', error);
    return [];
  }
}
