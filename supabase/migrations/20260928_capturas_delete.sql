grant delete on public.capturas to anon, authenticated;

create policy "capturas_delete_room"
  on public.capturas
  for delete
  to anon, authenticated
  using (sala_id = 'anil-locke-2026');
