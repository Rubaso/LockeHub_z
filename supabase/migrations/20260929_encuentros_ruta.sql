create table public.encuentros_ruta (
  sala_id text not null,
  jugador_id integer not null,
  ruta text not null,
  estado text not null check (estado in ('available', 'encountered', 'caught', 'missed')),
  pokemon_name text,
  primary key (sala_id, jugador_id, ruta)
);

alter table public.encuentros_ruta enable row level security;

create policy "encuentros_ruta_select_room"
  on public.encuentros_ruta
  for select
  to anon, authenticated
  using (sala_id = 'anil-locke-2026');

create policy "encuentros_ruta_insert_room"
  on public.encuentros_ruta
  for insert
  to anon, authenticated
  with check (sala_id = 'anil-locke-2026');

create policy "encuentros_ruta_update_room"
  on public.encuentros_ruta
  for update
  to anon, authenticated
  using (sala_id = 'anil-locke-2026')
  with check (sala_id = 'anil-locke-2026');

grant select, insert, update on public.encuentros_ruta to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'encuentros_ruta'
  ) then
    alter publication supabase_realtime add table public.encuentros_ruta;
  end if;
end
$$;
