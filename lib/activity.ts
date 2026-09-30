import { SALA_ID } from './constants'
import { supabase } from './supabase'

export type ActivityEvent = {
  id: number
  jugador_id: number
  tipo: 'captura' | 'muerte'
  pokemon_name: string
  pokemon_id: number | null
  ruta: string
  is_shiny: boolean
  ocurrido_en: string
}

export async function fetchRecentActivity(
  offset = 0,
  limit = 10
): Promise<ActivityEvent[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('feed_eventos')
    .select('id, jugador_id, tipo, pokemon_name, pokemon_id, ruta, is_shiny, ocurrido_en')
    .eq('sala_id', SALA_ID)
    .order('ocurrido_en', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('No se pudo cargar la actividad:', error)
    throw new Error('No se pudo cargar la actividad.')
  }

  return (data ?? []) as ActivityEvent[]
}
