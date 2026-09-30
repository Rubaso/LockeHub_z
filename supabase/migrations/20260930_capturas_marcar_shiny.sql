grant update on table public.capturas to anon, authenticated;

drop policy if exists "capturas_update_room"
  on public.capturas;

create policy "capturas_update_room"
  on public.capturas
  for update
  to anon, authenticated
  using (sala_id = 'anil-locke-2026')
  with check (sala_id = 'anil-locke-2026');

select pg_notify('pgrst', 'reload schema');
