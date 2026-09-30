alter table public.feed_eventos
  drop constraint if exists feed_eventos_tipo_check;

alter table public.feed_eventos
  add constraint feed_eventos_tipo_check
  check (tipo in ('captura', 'muerte', 'medalla'));

alter table public.feed_eventos
  add column if not exists medalla_id smallint;

alter table public.feed_eventos
  add constraint feed_eventos_medalla_id_check
  check (medalla_id is null or medalla_id between 0 and 11);

select pg_notify('pgrst', 'reload schema');
