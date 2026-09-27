import { TRAMOS } from './constants'
import type { CapturaRow } from './capturas'
import type { Pokemon } from './types'

const ZONAS_POR_TRAMO: Record<number, string[]> = {

  1: [
    'INICIAL',
    'Ruta 1',
    'Ruta 2',
    'Bosque Ladera',
    'Ruta 3',
    'Santuario de los Reyes'
  ],

  2: [
    'Ruta 4',
    'Bosque Ladera Parte 2',
    'Ruta 5',
    'Ruta 6',
    'Pueblo Profano'
  ],

  3: [
    'Ruta 7 Norte',
    'Ruta 7 Sur',
    'Pantano Profano',
    'Ruta 8',
    'Ruta 8 Este',
    'Ruta 8 Oeste'
  ],

  4: [
    'Ruta 9',
    'Ruta 10',
    'Ruta 11',
    'Ruta 12',
    'Isla Certijo'
  ],

  5: [
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
    'Ruta 19'
  ],

  7: [
    'Ruta 20',
    'Ruta 21',
    'Ruta 22'
  ],

  8: [
    'Ruta 23',
    'Ruta 24',
    'Ruta 25'
  ],

  9: [
    'Ruta 26'
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
    level: row.level,
    eventAt: row.event_at,
    eventReason: row.event_reason,
    captureSource: row.capture_source,
  }
}

export function isInBox(row: CapturaRow) {
  return row.estado !== 'MUERTO' && row.estado !== 'ESCAPADO' && row.estado !== 'INTERCAMBIADO'
}
