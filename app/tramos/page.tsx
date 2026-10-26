'use client'

import { useEffect, useState } from 'react'
import PlayerSelect from '@/components/PlayerSelect'
import TramoCard from '@/components/TramoCard'
import { PLAYERS, ROUTES, TRAMOS } from '@/lib/constants'
import { capturaToPokemon } from '@/lib/mapCapturas'
import { readSession } from '@/lib/session'
import { spriteUrl } from '@/lib/sprites'
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
      ? rows
        .filter((row) => row.jugador_id === playerId && row.estado !== 'INTERCAMBIADO')
        .map(capturaToPokemon)
      : []
  const sinTramo = pokemon.filter((poke) => poke.tramo === 0)
  const orderByRoute = (a: (typeof pokemon)[number], b: (typeof pokemon)[number]) =>
    ROUTES.indexOf(a.route) - ROUTES.indexOf(b.route)

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
          captures={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'alive').sort(orderByRoute)}
          fallen={pokemon.filter((p) => p.tramo === tramo.id && p.status === 'dead').sort(orderByRoute)}
        />
      ))}
      {sinTramo.length > 0 && (
        <section className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-5">
          <h2 className="text-lg font-bold text-amber-200">
            Pokémon pendientes de asignar a un tramo ({sinTramo.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            El save no proporciona una ruta reconocida para estos registros.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sinTramo.map((poke) => (
              <div
                key={poke.id}
                className={`w-28 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-center ${
                  poke.status === 'dead' ? 'opacity-60 grayscale' : ''
                }`}
                title={poke.route}
              >
                {poke.pokemonId > 0 && (
                  <img
                    src={spriteUrl(poke.pokemonId, poke.shiny)}
                    alt={poke.name}
                    className="mx-auto h-20 w-20"
                  />
                )}
                <p className="truncate text-xs capitalize text-zinc-100">{poke.name}</p>
                {poke.nickname && poke.nickname !== poke.name && (
                  <p className="truncate text-[10px] text-zinc-400">{poke.nickname}</p>
                )}
                <p className="mt-1 truncate text-[10px] text-amber-300">{poke.route}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
