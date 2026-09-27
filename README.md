# LockeHub

Web nueva para la run de Pokémon Z .

```bash
cd lockehub
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- Espectador: entra sin PIN.
- Con sesión de jugador, **Cargar save** en la cabecera lee `.rxdata` y guarda en la tabla `capturas`. Los datos del juego solo se suben cuando el jugador selecciona y carga su save.

En las tarjetas de la caja y los tramos, el jugador conectado puede borrar una fila de Pokémon con el icono de papelera y una confirmación. Supabase debe tener una política RLS que permita borrar la fila; la operación filtra además por el ID del jugador conectado. Los nombres de habilidades se traducen localmente al español con `lib/ability-names.es.json`.