alter table public.torneo
  add column if not exists tournament_key uuid not null default gen_random_uuid();

create table if not exists public.torneo_ediciones (
  tournament_key uuid primary key,
  sala_id text not null,
  tournament_name text not null,
  champion text not null default 'Por determinar',
  max_participants integer not null default 0,
  bracket_data jsonb not null default '[]'::jsonb,
  positions jsonb not null default '[]'::jsonb,
  saved_at timestamptz not null default now()
);

alter table public.torneo_ediciones enable row level security;

drop policy if exists "Anyone can read tournament editions" on public.torneo_ediciones;
create policy "Anyone can read tournament editions"
  on public.torneo_ediciones
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can save tournament editions" on public.torneo_ediciones;
create policy "Anyone can save tournament editions"
  on public.torneo_ediciones
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update tournament editions" on public.torneo_ediciones;
create policy "Anyone can update tournament editions"
  on public.torneo_ediciones
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.torneo_ediciones to anon, authenticated;
