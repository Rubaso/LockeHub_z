import { TRAMOS } from './constants'
import type { CapturaRow } from './capturas'
import type { Pokemon } from './types'

const ZONAS_POR_TRAMO: Record<number, string[]> = {

  1: [
    'Pueblo Lienzo',
    'INICIAL',
    'Ruta 1',
    'Pueblo Vinilo',
    'Ruta 2',
    'Catacumbas Meridionales',
    'Ciudad Grisalla',
    'Bosque Ladera',
    'Ruta 3',
  ],

  2: [
    'Pueblo Acrílico',
    'Ruta 4',
    'Pueblo Collage',
    'Bosque Ladera Parte 2',
    'Ruta 5',
    'Santuario de los Reyes',
    'Ruta 6',
    'Pueblo Profano'
  ],

  3: [
    'Pueblo Profano',
    'Ciudad Óleo',
    'Ruta 7 Norte',
    'Ruta 7 Sur',
    'Pantano Profano',
    'Ruta 8',
    'Ruta 8 Este',
    'Ruta 8 Oeste'
  ],

  4: [
    'Ciudad Novarte',
    'Ruta 9',
    'Ruta 10',
    'Ruta 11',
    'Ruta 12',
    'Isla Certijo'
  ],

  5: [
    'Pueblo Petroglifo',
    'Ruta 13',
    'Ruta 14',
    'Ruta 15',
    'Ruta 15 Parte 2',
    'Ruta 16 Norte',
    'Ruta 16 Sur'
  ],

  6: [
    'Ruta 17',
    'Ruta 18',
    'Ruta 19',
    'Ciudad Relieve',
    'Pueblo Vánitas',
    'Bastión Vánitas',
    'Ciudad Luminalia'
  ],

  7: [
    'Ciudad Romantis',
    'Ciudad Batik',
    'Ruta 20',
    'Ruta 21',
    'Ruta 22'
  ],

  8: [
    'Pueblo Fresco',
    'Pueblo Mosaico',
    'Ruta 23',
    'Ruta 24',
    'Ruta 25'
  ],

  9: [
    'Ciudad Fluxus',
    'Ciudad Fractal',
    'Ruta 26'
  ],

  10: [
    'Villa Pokémon',
    'Pueblo Sanguino',
    'Ciudad Yantra'
  ],

  12: [
    'Viejo Vánitas'
  ],

};

export function tramoFromRoute(ruta: string) {
  for (const tramo of TRAMOS) {
    if (ZONAS_POR_TRAMO[tramo.id]?.includes(ruta)) return tramo.id
  }
  return 0
}

export function capturaToPokemon(row: CapturaRow): Pokemon {
  return {
    id: row.id,
    playerId: row.jugador_id,
    name: row.pokemon_name,
    pokemonId: row.pokemon_id ?? 0,
    nature: '—',
    ability: row.habilidad ?? '—',
    shiny: !!row.is_shiny,
    isTeam: !!row.is_team,
    status: row.estado === 'MUERTO' ? 'dead' : 'alive',
    route: row.ruta,
    tramo: tramoFromRoute(row.ruta),
  }
}

export function isInBox(row: CapturaRow) {
  return row.estado !== 'MUERTO' && row.estado !== 'ESCAPADO' && row.estado !== 'INTERCAMBIADO'
}
