alter table public.capturas
  add column if not exists pokemon_nickname text;

alter table public.feed_eventos
  add column if not exists pokemon_nickname text;

select pg_notify('pgrst', 'reload schema');
