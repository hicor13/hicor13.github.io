-- gogologo leaderboard schema -- HANDOFF ARTIFACT, RUN MANUALLY
--
-- The anon key gogologo already uses (same one as garabatos-sprites.ts) has
-- no DDL rights, so this table cannot be created from the app or from an
-- agent session. Paste this whole file into the Supabase SQL editor for
-- project hvysswkivofvscfqysnj and run it once. Until this is run,
-- leaderboard-client.ts's submitScore/fetchTopScores calls will fail
-- (table not found) and the game degrades gracefully -- no leaderboard
-- section is shown, restart flow is unaffected.

create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  constraint leaderboard_name_length check (char_length(name) between 1 and 4),
  constraint leaderboard_score_nonnegative check (score >= 0)
);

-- Helpful for "top N scores" queries.
create index if not exists leaderboard_score_idx on public.leaderboard (score desc);

alter table public.leaderboard enable row level security;

-- Public, no-auth game -- same spirit as the existing Garabatos features
-- (anyone can post a drawing, anyone can view the gallery). Anyone may
-- submit a score and anyone may read the leaderboard; nobody (anon
-- included) may modify or delete existing rows.
create policy "Allow public insert on leaderboard"
  on public.leaderboard
  for insert
  to anon
  with check (true);

create policy "Allow public select on leaderboard"
  on public.leaderboard
  for select
  to anon
  using (true);

-- No update/delete policies are created for anon -- RLS defaults to
-- deny for any operation without a matching policy, so UPDATE/DELETE are
-- already blocked for the anon role once RLS is enabled above.
