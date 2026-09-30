import { SALA_ID } from './constants'
import { supabase } from './supabase'

export type PlayerMedals = Record<number, boolean[]>

export async function fetchPlayerMedals(): Promise<PlayerMedals | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('medallas_jugadores')
    .select('jugador_id, medalla_id')
    .eq('sala_id', SALA_ID)

  if (error) {
    console.error('No se pudieron cargar las medallas:', error)
    return null
  }

  const medals: PlayerMedals = {}
  for (const row of data ?? []) {
    medals[row.jugador_id] ??= Array.from({ length: 12 }, () => false)
    if (row.medalla_id >= 0 && row.medalla_id < 12) {
      medals[row.jugador_id][row.medalla_id] = true
    }
  }

  return medals
}
