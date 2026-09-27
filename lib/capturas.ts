import { SALA_ID } from './constants'
import { supabase } from './supabase'

export type CapturaRow = {
  id: number
  jugador_id: number
  ruta: string
  pokemon_name: string
  pokemon_id: number | null
  estado: string
  habilidad: string | null
  is_shiny: boolean | null
  is_team: boolean | null
  level?: number | null
  event_at?: string | null
  event_reason?: string | null
  capture_source?: string | null
}

export async function fetchCapturas(): Promise<CapturaRow[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('capturas')
    .select('id, jugador_id, ruta, pokemon_name, pokemon_id, estado, habilidad, is_shiny, is_team, level, event_at, event_reason, capture_source')
    .eq('sala_id', SALA_ID)

  if (error) {
    console.error(error)
    return null
  }

  return (data ?? []) as CapturaRow[]
}
