'use client'

import { useEffect, useState } from 'react'
import PlayerRow from '@/components/PlayerRow'
import { PLAYERS, sortPlayers } from '@/lib/constants'
import { capturaToPokemon, isInBox } from '@/lib/mapCapturas'
import { readAllSettings, readSession } from '@/lib/session'
import { useCapturas } from '@/lib/useCapturas'
import { supabase } from '@/lib/supabase'
import { fetchPlayerMedals } from '@/lib/playerMedals'
import type { Pokemon } from '@/lib/types'

export default function JugadoresPage() {
  const [loggedId, setLoggedId] = useState<number | null>(null)
  const [colors, setColors] = useState<Record<number, string>>({})
  const [medals, setMedals] = useState<Record<number, boolean[]>>({})
  const { rows, fromDatabase } = useCapturas()

  useEffect(() => {
    setLoggedId(readSession()?.id ?? null)
    const saved = readAllSettings()
    const map: Record<number, string> = {}
    for (const player of PLAYERS) {
      map[player.id] = saved[player.id]?.color ?? player.color
    }
    setColors(map)
    void fetchPlayerMedals().then((loaded) => {
      if (loaded) setMedals(loaded)
    })
    const loadRemoteColors = async () => {
      if (!supabase) return
      const { data } = await supabase.from('directos').select('jugador_id, color')
      for (const row of data ?? []) {
        if (row.color) map[row.jugador_id] = row.color
      }
      setColors({ ...map })
    }
    void loadRemoteColors()

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ playerId: number; settings: { color: string } }>).detail
      if (!detail?.settings?.color) return
      setColors((previous) => ({ ...previous, [detail.playerId]: detail.settings.color }))
    }
    window.addEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
    return () => window.removeEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
  }, [])

  const ordered = sortPlayers(PLAYERS, loggedId)

  const teamOf = (playerId: number): Pokemon[] => {
    if (fromDatabase && rows) {
      return rows
        .filter((row) => row.jugador_id === playerId && row.is_team && isInBox(row))
        .map(capturaToPokemon)
        .slice(0, 6)
    }
    return []
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Jugadores</h1>
      <p className="text-sm text-zinc-400">Clic en una fila para ver su caja.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {ordered.map((player) => (
          <PlayerRow
            key={player.id}
            player={{ ...player, color: colors[player.id] ?? player.color }}
            team={teamOf(player.id)}
            medals={medals[player.id]}
            isYou={loggedId === player.id}
          />
        ))}
      </div>
    </div>
  )
}
