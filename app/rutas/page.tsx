'use client'

import { useEffect, useState } from 'react'
import { PLAYERS, ROUTES, sortPlayers } from '@/lib/constants'
import { readSession } from '@/lib/session'
import { spriteUrl } from '@/lib/sprites'
import { useCapturas } from '@/lib/useCapturas'

const ESTADOS_ENCUENTRO = {
  available: { label: 'Disponible', className: 'text-zinc-500' },
  caught: { label: 'Capturado', className: 'text-emerald-400' },
  missed: { label: 'Fallido', className: 'text-red-400' },
  dead: { label: 'Muerto', className: 'text-rose-400' },
} as const

export default function RutasPage() {
  const [loggedId, setLoggedId] = useState<number | null>(null)
  const { rows, encounters, fromDatabase } = useCapturas()

  useEffect(() => {
    setLoggedId(readSession()?.id ?? null)
  }, [])

  const ordered = sortPlayers(PLAYERS, loggedId)

  const pokemonOnRoute = (playerId: number, route: string) => {
    if (!fromDatabase || !rows) return undefined
    const routePokemon = rows.filter(
      (row) =>
        row.jugador_id === playerId &&
        row.ruta === route &&
        row.estado !== 'ESCAPADO' &&
        row.estado !== 'INTERCAMBIADO'
    )
    return routePokemon.find((row) => row.estado !== 'MUERTO') ??
      routePokemon.find((row) => row.estado === 'MUERTO')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Rutas</h1>
      <p className="text-sm text-zinc-400">
        Encuentros y estados guardados por el mod Hardcore Nuzlocke.
      </p>
      {fromDatabase && encounters === null && (
        <p className="text-sm text-amber-300">
          No se pudieron cargar los estados del mod. Comprueba que la migración
          de encuentros esté aplicada en Supabase.
        </p>
      )}
      <div className="overflow-auto rounded-xl border border-zinc-800">
        <table className="min-w-max border-collapse text-left text-xs">
          <thead className="bg-zinc-900">
            <tr>
              <th className="sticky left-0 z-10 border-r border-zinc-800 bg-zinc-900 px-3 py-2 font-semibold">Jugador</th>
              {ROUTES.map((route) => (
                <th key={route} className="border-r border-zinc-800 px-2 py-2 font-semibold text-zinc-400">
                  {route}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((player) => (
              <tr key={player.id} className="border-t border-zinc-800">
                <td
                  className="sticky left-0 border-r border-zinc-800 bg-zinc-950 px-3 py-2 font-semibold"
                  style={{ color: player.color }}
                >
                  {player.name}
                  {loggedId === player.id ? ' · tú' : ''}
                </td>
                {ROUTES.map((route) => {
                  const poke = pokemonOnRoute(player.id, route)
                  const encounter = encounters?.find(
                    (row) => row.jugador_id === player.id && row.ruta === route
                  )
                  const savedStatus = encounter?.estado === 'encountered'
                    ? 'missed'
                    : encounter?.estado
                  const status = poke?.estado === 'MUERTO'
                    ? 'dead'
                    : savedStatus === 'available'
                      ? null
                      : savedStatus ?? (poke ? 'caught' : null)
                  return (
                    <td key={route} className="border-r border-zinc-800 px-2 py-1 text-center">
                      {poke?.pokemon_id ? (
                        <img
                          src={spriteUrl(poke.pokemon_id, !!poke.is_shiny)}
                          alt={poke.pokemon_name}
                          title={poke.pokemon_name}
                          className={`mx-auto h-20 w-20 ${poke.estado === 'MUERTO' ? 'grayscale opacity-60' : ''}`}
                        />
                      ) : null}
                      {status && (
                        <div
                          className={`max-w-24 text-[10px] leading-tight ${ESTADOS_ENCUENTRO[status].className}`}
                          title={encounter?.pokemon_name ?? ESTADOS_ENCUENTRO[status].label}
                        >
                          <div>{ESTADOS_ENCUENTRO[status].label}</div>
                          {encounter?.pokemon_name && (
                            <div className="truncate capitalize text-zinc-400">
                              {encounter.pokemon_name}
                            </div>
                          )}
                        </div>
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
