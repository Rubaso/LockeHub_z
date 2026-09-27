alter table public.capturas
  add column if not exists level integer,
  add column if not exists event_at timestamptz,
  add column if not exists event_reason text,
  add column if not exists capture_source text;
