'use client'

import Link from 'next/link'
import PokepasteStatus from '@/components/PokepasteStatus'
import { CAPTURAS_UPDATED_EVENT, EVENT_NAME, PLAYERS, SALA_ID } from '@/lib/constants'
import { fetchRecentShinies, fetchRecentActivity, type ActivityEvent } from '@/lib/activity'
import { spriteUrl } from '@/lib/sprites'
import { supabase } from '@/lib/supabase'
import ShinyIcon from '@/components/ShinyIcon'
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
  const [recentShinies, setRecentShinies] = useState<ActivityEvent[]>([])
  const activityOffset = useRef(0)
  const hasMoreActivity = useRef(true)
  const loadingMoreActivity = useRef(false)

  const loadActivity = useCallback(async () => {
    try {
      const [events, shinies] = await Promise.all([
        fetchRecentActivity(0, INITIAL_ACTIVITY_COUNT),
        fetchRecentShinies(),
      ])
      setActivity(events ?? [])
      setRecentShinies(shinies)
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
    void Promise.all([
      fetchRecentActivity(0, INITIAL_ACTIVITY_COUNT),
      fetchRecentShinies(),
    ])
      .then(([events, shinies]) => {
        if (cancelled) return
        setActivity(events ?? [])
        setRecentShinies(shinies)
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
      {recentShinies.length > 0 && (
        <section className="rounded-2xl border border-purple-400/60 bg-purple-950/50 px-6 py-5 text-center shadow-[0_0_35px_rgba(168,85,247,0.2)]">
          <p className="text-2xl font-black uppercase tracking-[0.2em] text-purple-200">
            ¡SHINYS ENCONTRADOS!
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {recentShinies.map((shiny) => {
              const playerName = playerNames.get(shiny.jugador_id) ?? `Jugador ${shiny.jugador_id}`
              return (
                <div key={shiny.id} className="flex min-w-52 flex-1 items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-900/40 px-4 py-3">
                  {shiny.pokemon_id ? (
                    <span className="relative block h-14 w-14 shrink-0">
                      <img src={spriteUrl(shiny.pokemon_id, true)} alt="" className="h-14 w-14" />
                      <ShinyIcon className="absolute right-0 top-0 h-6 w-6 text-amber-300" />
                    </span>
                  ) : null}
                  <div className="text-left">
                    <p className="font-bold text-purple-100">{playerName}</p>
                    <p className="text-sm text-purple-200">
                      {shiny.pokemon_nickname || shiny.pokemon_name}
                      {shiny.pokemon_nickname && ` (${shiny.pokemon_name})`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
      <section>
        <p className="text-xs uppercase tracking-widest text-zinc-500">Evento</p>
        <h1 className="text-3xl font-black text-zinc-100">{EVENT_NAME}</h1>
        <p className="text-sm text-zinc-400">Centro informativo de la partida.</p>
      </section>

      {tournament?.locked && (
        <Link href="/torneo" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
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
                Sube tu pokepaste (o pasaselo a él si todavia falta gente por subirlo) y habla con tu rival para jugar.
              </p>
            </div>
          </section>
        </Link>
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
                  const trade = event.tipo === 'captura' && event.ruta.startsWith('Don Prodigio ')
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
                        death ? 'bg-rose-950/25' : medal ? 'bg-amber-950/25' : trade ? 'bg-orange-950/35' : event.is_shiny ? 'bg-purple-950/40' : 'bg-teal-950/25'
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
                        <span className="relative block h-12 w-12 shrink-0">
                          <img
                            src={spriteUrl(event.pokemon_id, event.is_shiny)}
                            alt=""
                            className="h-12 w-12"
                          />
                          {event.is_shiny && <ShinyIcon className="absolute right-0 top-0 h-5 w-5 text-amber-300" />}
                        </span>
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
                              <span className="font-bold text-zinc-100">
                                {event.pokemon_nickname || event.pokemon_name}
                                {event.pokemon_nickname && (
                                  <span className="font-normal text-zinc-400"> ({event.pokemon_name})</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-teal-300">{playerName}</span>
                              {death ? ' perdió a ' : trade ? ' recibió a ' : ' capturó a '}
                              <span className={`font-bold ${death ? 'text-rose-300' : 'text-zinc-100'}`}>
                                {event.pokemon_nickname || event.pokemon_name}
                                {event.pokemon_nickname && (
                                  <span className="font-normal text-zinc-400"> ({event.pokemon_name})</span>
                                )}
                              </span>
                            </>
                          )}
                          {trade && (
                            <span className="ml-2 rounded bg-orange-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-300">
                              Intercambio
                            </span>
                          )}
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

        <div className="space-y-3">
          <section className="rounded-xl border border-purple-500/40 bg-purple-950/30 px-5 py-4 text-center">
            <p className="text-sm text-purple-200">¿Has encontrado un shiny?</p>
            <Link
              href="/marcar-shiny"
              onClick={(event) => {
                if (!window.confirm('¿Seguro? Podrás elegir qué Pokémon es shiny y avisaremos a todos los jugadores.')) {
                  event.preventDefault()
                }
              }}
              className="mt-2 inline-block rounded-lg bg-purple-600 px-5 py-2 text-sm font-black text-white hover:bg-purple-500"
            >
              ✦ ¡TENGO UN SHINY!
            </Link>
          </section>
          <PokepasteStatus />
        </div>
      </div>
    </div>
  )
}
