-- MAUSAM Supabase schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).

create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  interests text[] default '{}',
  preferred_location jsonb,
  notification_prefs jsonb default '{"alerts": true, "daily_summary": false}'::jsonb,
  units text default 'metric',
  persona_profile jsonb default null,
  updated_at timestamptz default now()
);

alter table public.preferences enable row level security;

drop policy if exists "Users can view own preferences" on public.preferences;
create policy "Users can view own preferences"
  on public.preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own preferences" on public.preferences;
create policy "Users can insert own preferences"
  on public.preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own preferences" on public.preferences;
create policy "Users can update own preferences"
  on public.preferences for update
  using (auth.uid() = user_id);

create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz default now()
);

alter table public.saved_locations enable row level security;

drop policy if exists "Users can view own saved locations" on public.saved_locations;
create policy "Users can view own saved locations"
  on public.saved_locations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved locations" on public.saved_locations;
create policy "Users can insert own saved locations"
  on public.saved_locations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved locations" on public.saved_locations;
create policy "Users can delete own saved locations"
  on public.saved_locations for delete
  using (auth.uid() = user_id);

-- Optional migration for existing projects (safe to re-run):
alter table public.preferences add column if not exists persona_profile jsonb default null;
