# LockeHub

Web nueva para la run de Pokémon Z .

```bash
cd lockehub
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- Espectador: entra sin PIN.
- Con sesión de jugador, **Cargar save** en la cabecera lee `.rxdata`, guarda los Pokémon en `capturas` e importa los estados y especies de encuentro que conserva el mod Hardcore Nuzlocke para la pestaña Rutas. Los datos del juego solo se suben cuando el jugador selecciona y carga su save.
- La actividad de Inicio muestra las 10 capturas y muertes más recientes según la fecha guardada en la partida. Para habilitarla, aplica `supabase/migrations/20260928_activity_feed.sql` en Supabase y vuelve a cargar los saves.
- Para importar los estados de encuentros en Rutas, aplica `supabase/migrations/20260929_encuentros_ruta.sql` en Supabase y vuelve a cargar cada save. Los saves sin datos del mod no aportan estados de encuentros.
- Para mostrar también el sprite de los encuentros fallidos, aplica `supabase/migrations/20260929_encuentros_ruta_sprite.sql` en Supabase y vuelve a cargar los saves.
- Para guardar las 12 medallas de cada jugador y mostrarlas en Jugadores, aplica `supabase/migrations/20260930_medallas_jugadores.sql` en Supabase y vuelve a cargar cada save. Las medallas conseguidas se acumulan y una partida antigua no las revierte.

En las tarjetas de la caja y los tramos, el jugador conectado puede borrar una fila de Pokémon con el icono de papelera y una confirmación. Supabase debe tener una política RLS que permita borrar la fila; la operación filtra además por el ID del jugador conectado. Los nombres de habilidades se traducen localmente al español con `lib/ability-names.es.json`.