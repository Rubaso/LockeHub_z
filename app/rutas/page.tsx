'use client'

import { useEffect, useState } from 'react'
import { PLAYERS, ROUTES, sortPlayers } from '@/lib/constants'
import { readSession } from '@/lib/session'
import { spriteUrl } from '@/lib/sprites'
import { useCapturas } from '@/lib/useCapturas'

export default function RutasPage() {
  const [loggedId, setLoggedId] = useState<number | null>(null)
  const { rows, fromDatabase } = useCapturas()

  useEffect(() => {
    setLoggedId(readSession()?.id ?? null)
  }, [])

  const ordered = sortPlayers(PLAYERS, loggedId)

  const pokemonOnRoute = (playerId: number, route: string) => {
    if (!fromDatabase || !rows) return undefined
    return rows.find(
      (row) =>
        row.jugador_id === playerId &&
        row.ruta === route &&
        row.estado !== 'MUERTO' &&
        row.estado !== 'ESCAPADO' &&
        row.estado !== 'INTERCAMBIADO'
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Rutas</h1>
      <p className="text-sm text-zinc-400">
        Qué encounters hay y cuáles faltan. Las muertes se marcan en Tramos.
      </p>
      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="min-w-max border-collapse text-left text-xs">
          <thead className="bg-zinc-900">
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-2 font-semibold">Jugador</th>
              {ROUTES.map((route) => (
                <th key={route} className="px-2 py-2 font-semibold text-zinc-400">
                  {route}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((player) => (
              <tr key={player.id} className="border-t border-zinc-800">
                <td
                  className="sticky left-0 bg-zinc-950 px-3 py-2 font-semibold"
                  style={{ color: player.color }}
                >
                  {player.name}
                  {loggedId === player.id ? ' · tú' : ''}
                </td>
                {ROUTES.map((route) => {
                  const poke = pokemonOnRoute(player.id, route)
                  return (
                    <td key={route} className="px-2 py-1 text-center">
                      {poke?.pokemon_id ? (
                        <img
                          src={spriteUrl(poke.pokemon_id, !!poke.is_shiny)}
                          alt={poke.pokemon_name}
                          title={poke.pokemon_name}
                          className="mx-auto h-8 w-8"
                        />
                      ) : (
                        <span className="text-zinc-700">·</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
