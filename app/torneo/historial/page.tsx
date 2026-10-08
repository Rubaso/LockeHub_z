'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { SALA_ID } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

type TournamentPosition = {
  player_name: string
  position: string
}

type TournamentHistory = {
  tournament_name: string
  positions: TournamentPosition[]
  saved_at: string
}

function rankOf(position: string) {
  const rank = Number(position.match(/^(\d+)\.º$/)?.[1])
  return Number.isInteger(rank) ? rank : null
}

export default function HistorialPage() {
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    if (!supabase) {
      setError('No hay conexión configurada con Supabase.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('torneo_ediciones')
        .select('tournament_name, positions, saved_at')
        .eq('sala_id', SALA_ID)
        .order('saved_at', { ascending: true })

      if (queryError) {
        console.error('No se pudo cargar el historial de torneos:', queryError)
        setError('No se pudo cargar el historial. Aplica la migración supabase/migrations/20261009_torneo_ediciones.sql en Supabase.')
      } else {
        setTournaments((data ?? []) as TournamentHistory[])
      }
    } catch (error) {
      console.error('No se pudo conectar para cargar el historial de torneos:', error)
      setError('No se pudo conectar para cargar el historial.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadHistory())

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadHistory()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [loadHistory])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Historial</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-teal-300 disabled:opacity-50"
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link href="/torneo" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-teal-300">
            Volver al torneo
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Cargando historial…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-rose-300">{error}</p>
      ) : tournaments.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Aún no hay torneos guardados. Usa «Guardar torneo y posiciones» al terminar una edición.
        </p>
      ) : (
        <div className="space-y-5">
          {tournaments.map((tournament, index) => {
            const topEight = tournament.positions
              .filter((entry) => {
                const rank = rankOf(entry.position)
                return rank !== null && rank <= 8
              })
              .sort((a, b) => (rankOf(a.position) ?? 99) - (rankOf(b.position) ?? 99))
            const remaining = tournament.positions.filter((entry) => {
              const rank = rankOf(entry.position)
              return rank === null || rank > 8
            })

            return (
              <section
                key={`${tournament.tournament_name}-${tournament.saved_at}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
              >
                <header className="mb-4 border-b border-zinc-800 pb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
                    Torneo {index + 1}
                  </p>
                  <h2 className="mt-1 text-xl font-black">{tournament.tournament_name}</h2>
                  <time className="mt-1 block text-xs text-zinc-500">
                    {new Date(tournament.saved_at).toLocaleDateString('es-ES')}
                  </time>
                </header>

                <div className="space-y-5">
                  <section>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-300">
                      Top 8
                    </h3>
                    {topEight.length > 0 ? (
                      <ol className="space-y-2">
                        {topEight.map((entry) => (
                          <li
                            key={`${entry.position}-${entry.player_name}`}
                            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2"
                          >
                            <span className="w-10 shrink-0 font-black text-amber-200">
                              {entry.position}
                            </span>
                            <span className="font-semibold text-zinc-100">{entry.player_name}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-zinc-500">Aún no hay puestos del top 8 confirmados.</p>
                    )}
                  </section>

                  {remaining.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-400">
                        Resto de participantes
                      </h3>
                      <ol className="space-y-2">
                        {remaining.map((entry) => (
                          <li
                            key={`${entry.position}-${entry.player_name}`}
                            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
                          >
                            <span className="min-w-32 text-zinc-500">{entry.position}</span>
                            <span className="text-zinc-300">{entry.player_name}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
