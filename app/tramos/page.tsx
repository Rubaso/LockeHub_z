'use client'

import { useEffect, useState } from 'react'
import PlayerSelect from '@/components/PlayerSelect'
import TramoCard from '@/components/TramoCard'
import { PLAYERS, TRAMOS } from '@/lib/constants'
import { capturaToPokemon } from '@/lib/mapCapturas'
import { readSession } from '@/lib/session'
import { useCapturas } from '@/lib/useCapturas'

export default function TramosPage() {
  const [playerId, setPlayerId] = useState(PLAYERS[0].id)
  const { rows, fromDatabase } = useCapturas()

  useEffect(() => {
    const session = readSession()
    if (session) setPlayerId(session.id)
  }, [])

  const pokemon =
    fromDatabase && rows
      ? rows.filter((row) => row.jugador_id === playerId).map(capturaToPokemon)
      : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Tramos</h1>
          <p className="text-sm text-zinc-400">Un gimnasio por ficha. Aquí se marcarán las muertes.</p>
        </div>
        <PlayerSelect value={playerId} onChange={setPlayerId} />
      </div>

      {TRAMOS.map((tramo) => (
        <TramoCard
          key={tramo.id}
          tramo={tramo}
          captures={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'alive')}
          fallen={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'dead')}
          evolutions={[]}
        />
      ))}
    </div>
  )
}
