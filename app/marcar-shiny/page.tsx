'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import PlayerSelect from '@/components/PlayerSelect'
import TramoCard from '@/components/TramoCard'
import { PLAYERS, TRAMOS } from '@/lib/constants'
import { capturaToPokemon } from '@/lib/mapCapturas'
import { readSession } from '@/lib/session'
import { useCapturas } from '@/lib/useCapturas'

export default function MarcarShinyPage() {
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
          <Link href="/inicio" className="text-sm text-zinc-400 hover:text-purple-300">
            ← Inicio
          </Link>
          <h1 className="mt-2 text-2xl font-black">Marcar shiny</h1>
          <p className="text-sm text-zinc-400">
            Elige el Pokémon shiny. Se avisará a todos los jugadores.
          </p>
        </div>
        <PlayerSelect value={playerId} onChange={setPlayerId} />
      </div>

      {TRAMOS.map((tramo) => (
        <TramoCard
          key={tramo.id}
          tramo={tramo}
          captures={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'alive')}
          fallen={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'dead')}
          markingShiny
        />
      ))}
    </div>
  )
}
