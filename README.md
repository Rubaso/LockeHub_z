# LockeHub

Web nueva para la run de Pokémon Z .

```bash
cd lockehub
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- Espectador: entra sin PIN.
- Con sesión de jugador, **Cargar save** en la cabecera lee `.rxdata` y guarda en la tabla `capturas`.

## Sincronización del juego

`POST /api/game-events` recibe eventos del mod de Pokémon Z. Configura `POKEMON_Z_SYNC_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` en el despliegue de Lockehub. En cada instalación del juego, establece el ID del jugador, la URL `https://<dominio-lockehub>/api/game-events` y el mismo token en `Mods/HardcoreNuzlocke/Config/lockehub.rb`. No expongas la clave `service_role` en el juego.

El endpoint actualiza o crea la fila del Pokémon en `capturas`, usando `trainerId:personalId` para conciliar eventos automáticos con una importación manual de la partida. Sincroniza capturas, muertes permanentes con nivel/fecha/zona, encuentros perdidos con motivo y el origen de obtención (salvaje, estático, regalo o huevo). No sincroniza el estado de la run. Para almacenar los metadatos nuevos, ejecuta `supabase/migrations/20260927_game_event_details.sql` en el SQL Editor de Supabase. La página de jugadores y las rutas reciben actualizaciones periódicas y por Supabase Realtime; las rutas muestran una × cuando se perdió un encuentro.

En las tarjetas de la caja y los tramos, el jugador conectado puede borrar una fila de Pokémon con el icono de papelera y una confirmación. Supabase debe tener una política RLS que permita borrar la fila; la operación filtra además por el ID del jugador conectado. Los nombres de habilidades se traducen localmente al español con `lib/ability-names.es.json`.