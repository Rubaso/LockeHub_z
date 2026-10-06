import { SALA_ID } from './constants'
import { supabase } from './supabase'
import type { PokemonBattleData } from './rxdataParser'

export type CapturaRow = {
  id: number
  save_pokemon_id: string | null
  jugador_id: number
  ruta: string
  pokemon_name: string
  pokemon_nickname: string | null
  pokemon_id: number | null
  estado: string
  habilidad: string | null
  is_shiny: boolean | null
  is_team: boolean | null
  battle_data: PokemonBattleData | null
}

export type EncounterRouteRow = {
  jugador_id: number
  ruta: string
  estado: 'available' | 'encountered' | 'caught' | 'missed'
  pokemon_name: string | null
  pokemon_id: number | null
}

export async function fetchCapturas(): Promise<CapturaRow[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('capturas')
    .select('id, save_pokemon_id, jugador_id, ruta, pokemon_name, pokemon_nickname, pokemon_id, estado, habilidad, is_shiny, is_team, battle_data')
    .eq('sala_id', SALA_ID)

  if (error) {
    console.error(error)
    return null
  }

  return (data ?? []) as CapturaRow[]
}

export async function fetchEncuentrosRuta(): Promise<EncounterRouteRow[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('encuentros_ruta')
    .select('jugador_id, ruta, estado, pokemon_name, pokemon_id')
    .eq('sala_id', SALA_ID)

  if (error) {
    console.error(error)
    return null
  }

  return (data ?? []) as EncounterRouteRow[]
}
