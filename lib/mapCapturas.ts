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
    'Cueva Grisalla',
    'Estático especial - Cueva Grisalla',
    'Pikachu',
  ],

  2: [
    'Pueblo Acrílico',
    'Ruta 3',
    'Pueblo Collage',
    'Ruta 4',
    'Don Prodigio Ruta 4',
    'Ciudad Óleo',
    'Bosque Ladera',
    'Ruta 5',
  ],

  3: [
    'Santuario de los Reyes',
    'Chateau Rosillon',
    'Vieja Biblioteca',
    'Ruta 6',
    'Cueva Lóbrega',
    'Pueblo Profano',
    'Don Prodigio Pueblo Profano',
    'Ciudad Novarte',
    'Taller Quemado',
    'Cueva Refulgente',
    'Ruta 7 Norte',
    'Ruta 7 Sur',
    'Pantano Profano',
    'Colina de Tormenta',
    'Santuario Prosperidad',
    'Magikarp',
  ],

  4: [
    'Ruta 8',
    'Misión Pañuelo',
    'Don Prodigio Ruta 8',
    'Ruta 8 Oeste',
    'Bosque Errante',
    'Cueva Psique',
    'Catacumbas Septentrionales',
    'Ruta 9',
  ],

  5: [
    'Torre de Guardia Sur',
    'Pueblo Petroglifo',
    'Ruta 10',
    'Isla Certijo',
    'Don Prodigio Fort Leviatán',
    'Lapras',
  ],

  6: [
    'Ruta 11',
    'Ruta 12',
    'Ciudad Relieve',
    'Pueblo Vánitas',
    'Bastión Vánitas',
    'Ruta 13',
    'Misión Mosqueteros',
    'Ciudad Luminalia',
    'Este no vale',
    'Criptas de Luminalia',
    'Don Prodigio Ciudad Luminalia - Norte',
    'Estático especial - Catedral Señorial',
  ],

  7: [
    'Ruta 14',
    'Ciudad Romantis',
    'Casa de las Brujas',
    'Ruta 15',
    'Ciudad Batik',
    'Ruta 16',
    'Catacumbas Orientales',
    'Gruta Helada',
    'Gruta Tierraunida',
  ],

  8: [
    'Ruta 17',
    'Pueblo Fresco',
    'Ruta 18',
    'Pueblo Mosaico',
    'Ruta 19',
    'Costa Sanguina',
    'Bahía Azul',
    'Fondo Marino',
    'Cueva Desenlace',
    'Pirineos de Kalos',
    'Don Prodigio Pirineos de Kalos',
  ],

  9: [
    'Ruta 20',
    'Ciudad Fluxus',
    'Ciudad Fractal',
    'Ruta 21',
    'Isla Montesanto',
    'Fondo del Lago',
    'Maraña Oscura',
  ],

  10: [
    'Ruta 22',
    'Villa Pokémon',
    'Pueblo Sanguino',
    'Ruta 23',
    'Ciudad Yantra',
    'Huerto Vánitas',
    'Manantial Profundo',
  ],

  11: [
    'Ruta 24',
    'Ruta 25',
    'Petrocueva',
    'Madriguera Profunda',
    'Sima Ardiente',
    'Catacumbas Occidentales',
    'Cueva de los Reflejos',
  ],

  12: [
    'Ruta 26',
    'Cámara Druídica',
    'Viejo Vánitas',
    'Torre Oscura',
    'Torre Oscura P0',
    'Torre Oscura P1',
    'Torre Oscura P2',
    'Torre Oscura P3',
  ],
}

const ROUTE_ALIASES: Record<string, string> = {
  'Colina Tormenta': 'Colina de Tormenta',
  'Gruta Tierrunida': 'Gruta Tierraunida',
}

export function tramoFromRoute(ruta: string) {
  const canonicalRoute = ROUTE_ALIASES[ruta] ?? ruta
  for (const tramo of TRAMOS) {
    if (ZONAS_POR_TRAMO[tramo.id]?.includes(canonicalRoute)) return tramo.id
  }
  return 0
}

export function capturaToPokemon(row: CapturaRow): Pokemon {
  return {
    id: row.id,
    savePokemonId: row.save_pokemon_id,
    playerId: row.jugador_id,
    name: row.pokemon_name,
    nickname: row.pokemon_nickname,
    pokemonId: row.pokemon_id ?? 0,
    nature: '—',
    ability: row.habilidad ?? '—',
    shiny: !!row.is_shiny,
    isTeam: !!row.is_team,
    status: row.estado === 'MUERTO' ? 'dead' : 'alive',
    route: row.ruta,
    tramo: tramoFromRoute(row.ruta),
    battleData: row.battle_data,
  }
}

export function isInBox(row: CapturaRow) {
  return row.estado !== 'MUERTO' &&
    row.estado !== 'ESCAPADO' &&
    row.estado !== 'INTERCAMBIADO' &&
    row.estado !== 'FUERA_CAJA'
}
