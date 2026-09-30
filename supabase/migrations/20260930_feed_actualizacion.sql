alter table public.feed_eventos
  add column if not exists pokemon_nickname text;

grant update on table public.feed_eventos to anon, authenticated;

drop policy if exists "feed_eventos_update_room"
  on public.feed_eventos;

create policy "feed_eventos_update_room"
  on public.feed_eventos
  for update
  to anon, authenticated
  using (sala_id = 'anil-locke-2026')
  with check (sala_id = 'anil-locke-2026');

select pg_notify('pgrst', 'reload schema');
