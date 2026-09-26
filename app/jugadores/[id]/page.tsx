'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import PokemonCard from '@/components/PokemonCard'
import { PLAYERS } from '@/lib/constants'
import { capturaToPokemon, isInBox } from '@/lib/mapCapturas'
import { useCapturas } from '@/lib/useCapturas'

export default function CajaPage() {
  const params = useParams()
  const id = Number(params.id)
  const player = PLAYERS.find((p) => p.id === id)
  const { rows, fromDatabase } = useCapturas()

  if (!player) {
    return (
      <p className="text-sm text-zinc-400">
        Jugador no encontrado.{' '}
        <Link href="/jugadores" className="text-teal-400">
          Volver
        </Link>
      </p>
    )
  }

  const box =
    fromDatabase && rows
      ? rows.filter((row) => row.jugador_id === id && isInBox(row)).map(capturaToPokemon)
      : []

  return (
    <div className="space-y-4">
      <Link href="/jugadores" className="text-sm text-zinc-400 hover:text-teal-300">
        ← Jugadores
      </Link>
      <h1 className="text-2xl font-black">Caja de {player.name}</h1>
      {box.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Esta caja está vacía. Si eres este jugador, sube tu save arriba.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {box.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </div>
      )}
    </div>
  )
}
