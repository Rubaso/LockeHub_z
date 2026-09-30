create table public.medallas_jugadores (
  sala_id text not null,
  jugador_id integer not null,
  medalla_id smallint not null check (medalla_id between 0 and 11),
  obtenida_en timestamptz not null default now(),
  primary key (sala_id, jugador_id, medalla_id)
);

alter table public.medallas_jugadores enable row level security;

create policy "medallas_jugadores_select_room"
  on public.medallas_jugadores
  for select
  to anon, authenticated
  using (sala_id = 'anil-locke-2026');

create policy "medallas_jugadores_insert_room"
  on public.medallas_jugadores
  for insert
  to anon, authenticated
  with check (sala_id = 'anil-locke-2026');

grant select, insert on public.medallas_jugadores to anon, authenticated;
