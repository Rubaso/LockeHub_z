'use client'

import { useEffect, useRef, useState } from 'react'
import { PLAYERS, ROUTES, sortPlayers } from '@/lib/constants'
import { readSession } from '@/lib/session'
import { spriteUrl } from '@/lib/sprites'
import { useCapturas } from '@/lib/useCapturas'
import ShinyIcon from '@/components/ShinyIcon'

const ESTADOS_ENCUENTRO = {
  available: { label: 'Disponible', className: 'text-zinc-500' },
  caught: { label: 'Capturado', className: 'text-emerald-400' },
  missed: { label: 'Fallido', className: 'text-red-400' },
  dead: { label: 'Muerto', className: 'text-rose-400' },
} as const

export default function RutasPage() {
  const [loggedId, setLoggedId] = useState<number | null>(null)
  const [tableScrollWidth, setTableScrollWidth] = useState(0)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const { rows, encounters, fromDatabase } = useCapturas()

  useEffect(() => {
    setLoggedId(readSession()?.id ?? null)
  }, [])

  useEffect(() => {
    const table = tableRef.current
    if (!table) return

    const updateWidth = () => setTableScrollWidth(table.scrollWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(table)
    return () => observer.disconnect()
  }, [])

  const syncScroll = (source: HTMLDivElement, target: { current: HTMLDivElement | null }) => {
    if (target.current && target.current.scrollLeft !== source.scrollLeft) {
      target.current.scrollLeft = source.scrollLeft
    }
  }

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
      <div
        ref={topScrollRef}
        onScroll={(event) => syncScroll(event.currentTarget, bottomScrollRef)}
        className="overflow-x-auto overflow-y-hidden rounded-t-xl border border-zinc-800 border-b-0"
        aria-label="Desplazamiento horizontal de rutas"
      >
        <div style={{ width: tableScrollWidth, height: 1 }} />
      </div>
      <div
        ref={bottomScrollRef}
        onScroll={(event) => syncScroll(event.currentTarget, topScrollRef)}
        className="overflow-auto rounded-b-xl border border-zinc-800"
      >
        <table ref={tableRef} className="min-w-max border-collapse text-left text-xs">
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
                  const status = poke
                    ? poke.estado === 'MUERTO' ? 'dead' : 'caught'
                    : savedStatus === 'available' ? null : savedStatus
                  const spriteId = poke?.pokemon_id ?? encounter?.pokemon_id
                  const spriteName = poke?.pokemon_name ?? encounter?.pokemon_name
                  const displayName = poke?.pokemon_nickname || spriteName
                  return (
                    <td key={route} className="border-r border-zinc-800 px-2 py-1 text-center">
                      {spriteId ? (
                        <span className="relative mx-auto block h-20 w-20">
                          <img
                            src={spriteUrl(spriteId, !!poke?.is_shiny)}
                            alt={displayName ?? 'Pokémon del encuentro'}
                            title={displayName ?? 'Pokémon del encuentro'}
                            className={`h-20 w-20 ${poke?.estado === 'MUERTO' ? 'grayscale opacity-60' : ''}`}
                          />
                          {poke?.is_shiny && <ShinyIcon className="absolute right-0 top-0 h-5 w-5 text-amber-300" />}
                        </span>
                      ) : null}
                      {status && (
                        <div
                          className={`max-w-24 text-[10px] leading-tight ${ESTADOS_ENCUENTRO[status].className}`}
                          title={displayName ?? ESTADOS_ENCUENTRO[status].label}
                        >
                          <div>{ESTADOS_ENCUENTRO[status].label}</div>
                          {spriteName && (
                            <div className="truncate capitalize text-zinc-400">
                              {displayName}
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
