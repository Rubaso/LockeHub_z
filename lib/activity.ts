import { SALA_ID } from './constants'
import { supabase } from './supabase'

export type ActivityEvent = {
  id: number
  jugador_id: number
  tipo: 'captura' | 'muerte' | 'medalla'
  medalla_id: number | null
  pokemon_name: string
  pokemon_nickname: string | null
  pokemon_id: number | null
  ruta: string
  is_shiny: boolean
  ocurrido_en: string
}

export async function fetchLatestShiny(): Promise<ActivityEvent | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('feed_eventos')
    .select('id, jugador_id, tipo, medalla_id, pokemon_name, pokemon_nickname, pokemon_id, ruta, is_shiny, ocurrido_en')
    .eq('sala_id', SALA_ID)
    .eq('tipo', 'captura')
    .eq('is_shiny', true)
    .order('ocurrido_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('No se pudo cargar el último shiny:', error)
    return null
  }

  return data as ActivityEvent | null
}

export async function fetchRecentShinies(): Promise<ActivityEvent[]> {
  if (!supabase) return []

  const since = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('feed_eventos')
    .select('id, jugador_id, tipo, medalla_id, pokemon_name, pokemon_nickname, pokemon_id, ruta, is_shiny, ocurrido_en')
    .eq('sala_id', SALA_ID)
    .eq('tipo', 'captura')
    .eq('is_shiny', true)
    .gte('ocurrido_en', since)
    .order('ocurrido_en', { ascending: false })
    .order('id', { ascending: false })

  if (error) {
    console.error('No se pudieron cargar los shinys recientes:', error)
    return []
  }

  return (data ?? []) as ActivityEvent[]
}

export async function fetchRecentActivity(
  offset = 0,
  limit = 10
): Promise<ActivityEvent[] | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('feed_eventos')
    .select('id, jugador_id, tipo, medalla_id, pokemon_name, pokemon_nickname, pokemon_id, ruta, is_shiny, ocurrido_en')
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
