'use client'

import Link from 'next/link'
import PokepasteStatus from '@/components/PokepasteStatus'
import { CAPTURAS_UPDATED_EVENT, EVENT_NAME, PLAYERS, SALA_ID } from '@/lib/constants'
import { fetchRecentActivity, type ActivityEvent } from '@/lib/activity'
import { spriteUrl } from '@/lib/sprites'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useRef, useState } from 'react'

const INITIAL_ACTIVITY_COUNT = 20
const ACTIVITY_PAGE_SIZE = 10

export default function InicioPage() {
  const [tournament, setTournament] = useState<{ name: string; locked: boolean } | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityLoadingMore, setActivityLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activityError, setActivityError] = useState(false)
  const activityOffset = useRef(0)
  const hasMoreActivity = useRef(true)
  const loadingMoreActivity = useRef(false)

  const loadActivity = useCallback(async () => {
    try {
      const events = await fetchRecentActivity(0, INITIAL_ACTIVITY_COUNT)
      setActivity(events ?? [])
      activityOffset.current = events?.length ?? 0
      hasMoreActivity.current = (events?.length ?? 0) === INITIAL_ACTIVITY_COUNT
      setHasMore(hasMoreActivity.current)
      setActivityError(false)
    } catch {
      setActivityError(true)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const loadMoreActivity = useCallback(async () => {
    if (!hasMoreActivity.current || loadingMoreActivity.current) return
    loadingMoreActivity.current = true
    setActivityLoadingMore(true)
    try {
      const events = await fetchRecentActivity(activityOffset.current, ACTIVITY_PAGE_SIZE)
      const nextEvents = events ?? []
      setActivity((current) => [...current, ...nextEvents])
      activityOffset.current += nextEvents.length
      hasMoreActivity.current = nextEvents.length === ACTIVITY_PAGE_SIZE
      setHasMore(hasMoreActivity.current)
    } catch {
      setActivityError(true)
    } finally {
      loadingMoreActivity.current = false
      setActivityLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchRecentActivity(0, INITIAL_ACTIVITY_COUNT)
      .then((events) => {
        if (cancelled) return
        setActivity(events ?? [])
        activityOffset.current = events?.length ?? 0
        hasMoreActivity.current = (events?.length ?? 0) === INITIAL_ACTIVITY_COUNT
        setHasMore(hasMoreActivity.current)
        setActivityError(false)
      })
      .catch(() => {
        if (!cancelled) setActivityError(true)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })

    window.addEventListener(CAPTURAS_UPDATED_EVENT, loadActivity)
    const activityChannel = supabase
      ?.channel('realtime_feed_eventos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_eventos',
          filter: `sala_id=eq.${SALA_ID}`,
        },
        () => void loadActivity()
      )
      .subscribe()

    const loadTournament = async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('torneo')
        .select('tournament_name, is_locked')
        .eq('id', 1)
        .maybeSingle()
      if (data?.is_locked) {
        setTournament({ name: data.tournament_name || 'Torneo', locked: true })
      } else {
        setTournament(null)
      }
    }
    void loadTournament()

    return () => {
      cancelled = true
      window.removeEventListener(CAPTURAS_UPDATED_EVENT, loadActivity)
      if (activityChannel) void supabase?.removeChannel(activityChannel)
    }
  }, [loadActivity])

  const playerNames = new Map(PLAYERS.map((player) => [player.id, player.name]))

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Evento</p>
        <h1 className="text-3xl font-black text-zinc-100">{EVENT_NAME}</h1>
        <p className="text-sm text-zinc-400">Centro informativo de la partida.</p>
      </section>

      {tournament?.locked && (
        <section className="group relative isolate overflow-hidden rounded-2xl border border-amber-400/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
          <div
            className="absolute inset-0 scale-100 bg-cover bg-center opacity-35 transition-transform duration-500 ease-out group-hover:scale-110"
            style={{ backgroundImage: "url('/sprites/lideres/1poster.png')" }}
          />
          <div className="absolute inset-0 bg-zinc-950/65" />
          <div className="relative p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Torneo iniciado</p>
            <h2 className="mt-1 text-2xl font-black text-amber-100">{tournament.name}</h2>
            <p className="mt-1 text-sm text-amber-200/70">
              El cuadro está bloqueado y la competición ha comenzado.
            </p>
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Actividad</h2>
            <div
              onScroll={(event) => {
                const element = event.currentTarget
                if (element.scrollHeight - element.scrollTop - element.clientHeight < 100) {
                  void loadMoreActivity()
                }
              }}
              className="max-h-[48rem] overflow-y-auto rounded-xl border border-zinc-800"
            >
            <ol className="divide-y divide-zinc-800">
              {activityLoading ? (
                <li className="p-4 text-sm text-zinc-500">Cargando actividad…</li>
              ) : activityError ? (
                <li className="p-4 text-sm text-rose-300">
                  No se pudo cargar la actividad. Comprueba que la migración de la feed esté aplicada en Supabase.
                </li>
              ) : activity.length === 0 ? (
                <li className="p-4 text-sm text-zinc-500">
                  Aún no hay eventos en la actividad. Para importar el historial con sus fechas reales, vuelve a cargar tu save desde la cabecera.
                </li>
              ) : (
                activity.map((event) => {
                  const death = event.tipo === 'muerte'
                  const medal = event.tipo === 'medalla'
                  const initial = !death && event.ruta === 'INICIAL'
                  const playerName = playerNames.get(event.jugador_id) ?? `Jugador ${event.jugador_id}`
                  const happenedAt = new Date(event.ocurrido_en)
                  const dateLabel = new Intl.DateTimeFormat('es-ES', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(happenedAt)

                  return (
                    <li
                      key={event.id}
                      className={`flex items-center gap-3 p-3 ${
                        death ? 'bg-rose-950/25' : medal ? 'bg-amber-950/25' : 'bg-teal-950/25'
                      }`}
                    >
                      {medal ? (
                        <span
                          className="h-12 w-12 shrink-0 bg-[length:192px_48px] bg-no-repeat"
                          style={{
                            backgroundImage: "url('/medals/badges.png')",
                            backgroundPosition: `${(event.medalla_id ?? 0) % 8 * -24}px ${Math.floor((event.medalla_id ?? 0) / 8) * -24}px`,
                          }}
                        />
                      ) : event.pokemon_id ? (
                        <img
                          src={spriteUrl(event.pokemon_id, event.is_shiny)}
                          alt=""
                          className="h-12 w-12 shrink-0"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg">
                          {death ? '†' : '+'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">
                          {medal ? (
                            <>
                              <span className="font-semibold text-amber-300">{playerName}</span>
                              {' ha conseguido la '}
                              <span className="font-bold text-amber-200">medalla {event.medalla_id! + 1}</span>
                            </>
                          ) : initial ? (
                            <>
                              El inicial de{' '}
                              <span className="font-semibold text-teal-300">{playerName}</span>
                              {' '}ha sido{' '}
                              <span className="font-bold text-zinc-100">{event.pokemon_name}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-teal-300">{playerName}</span>
                              {death ? ' perdió a ' : ' capturó a '}
                              <span className={`font-bold ${death ? 'text-rose-300' : 'text-zinc-100'}`}>
                                {event.pokemon_name}
                              </span>
                            </>
                          )}
                          {event.is_shiny && <span className="ml-1 text-amber-300">✦</span>}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {event.ruta} · {dateLabel}
                        </p>
                      </div>
                    </li>
                  )
                })
              )}
              {activityLoadingMore && (
                <li className="p-4 text-center text-sm text-zinc-500">Cargando más actividad…</li>
              )}
              {!activityLoading && !activityLoadingMore && activity.length > 0 && !hasMore && (
                <li className="p-3 text-center text-xs text-zinc-600">No hay más actividad.</li>
              )}
            </ol>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: '/jugadores', label: 'Jugadores' },
              { href: '/rutas', label: 'Rutas' },
              { href: '/tramos', label: 'Tramos' },
              { href: '/torneo', label: 'Torneo' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-5 text-center font-bold hover:border-teal-500/50"
              >
                {link.label}
              </Link>
            ))}
          </section>
        </div>

        <PokepasteStatus />
      </div>
    </div>
  )
}
