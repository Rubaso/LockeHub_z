alter table public.capturas
  add column if not exists battle_data jsonb;
