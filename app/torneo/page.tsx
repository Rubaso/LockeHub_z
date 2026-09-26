'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ORGANIZER_PLAYER_ID, PLAYERS, SALA_ID } from '@/lib/constants'
import { readAllSettings, readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

type Match = {
  id: string
  player1: string | null
  player2: string | null
  winner: string | null
}

type Round = {
  name: string
  matches: Match[]
}

type TeamModal = {
  playerName: string
  text: string
}

function makeBracket(names: string[], randomize: boolean): Round[] {
  const slots = [...names]
  if (randomize) {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }
  }

  const size = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, slots.length))))
  while (slots.length < size) slots.push('BYE')

  const rounds: Round[] = []
  let current: (string | null)[] = slots
  let roundNumber = 1

  while (current.length >= 2) {
    rounds.push({
      name: current.length === 2 ? 'Final' : `Ronda ${roundNumber}`,
      matches: Array.from({ length: current.length / 2 }, (_, index) => ({
        id: `r${roundNumber}-m${index + 1}`,
        player1: current[index * 2] ?? null,
        player2: current[index * 2 + 1] ?? null,
        winner: null,
      })),
    })
    current = Array.from({ length: current.length / 2 }, () => null as string | null)
    roundNumber++
  }

  return rounds
}

function participants(rounds: Round[]) {
  return Array.from(
    new Set(
      (rounds[0]?.matches ?? []).flatMap((match) =>
        [match.player1, match.player2].filter(
          (name): name is string => Boolean(name && name !== 'BYE')
        )
      )
    )
  )
}

function rivalFor(rounds: Round[], playerName: string) {
  let rival: string | null = null
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.player1 === playerName && match.player2 && match.player2 !== 'BYE') {
        rival = match.player2
      }
      if (match.player2 === playerName && match.player1 && match.player1 !== 'BYE') {
        rival = match.player1
      }
    }
  }
  return rival
}

export default function TorneoPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [locked, setLocked] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dragged, setDragged] = useState<{ round: number; match: number; slot: 1 | 2 } | null>(null)
  const [delivered, setDelivered] = useState<Set<number>>(new Set())
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [teamModal, setTeamModal] = useState<TeamModal | null>(null)
  const [colors, setColors] = useState<Record<number, string>>({})

  const loadTournament = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('torneo')
      .select('bracket_data, is_locked, tournament_name')
      .eq('sala_id', SALA_ID)
      .maybeSingle()

    if (data?.bracket_data) setRounds(data.bracket_data as Round[])
    else setRounds([])
    setLocked(Boolean(data?.is_locked))
    setTournamentName(data?.tournament_name ?? '')
    setLoading(false)
  }, [])

  const loadDelivered = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('directos')
      .select('jugador_id, pokepaste_text')
      .not('pokepaste_text', 'is', null)
      .neq('pokepaste_text', '')

    setDelivered(new Set((data ?? []).map((row) => row.jugador_id)))
  }, [])

  useEffect(() => {
    const currentSession = readSession()
    setSessionId(currentSession?.id ?? null)
    const stored = readAllSettings()
    const colorMap = Object.fromEntries(
      PLAYERS.map((player) => [player.id, stored[player.id]?.color || player.color])
    )
    setColors(colorMap)
    const loadRemoteColors = async () => {
      if (!supabase) return
      const { data } = await supabase.from('directos').select('jugador_id, color')
      for (const row of data ?? []) {
        if (row.color) colorMap[row.jugador_id] = row.color
      }
      setColors({ ...colorMap })
    }
    void loadRemoteColors()
    loadTournament()
    loadDelivered()

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ playerId: number; settings: { color: string } }>).detail
      if (!detail?.settings?.color) return
      setColors((previous) => ({ ...previous, [detail.playerId]: detail.settings.color }))
    }
    window.addEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
    return () => window.removeEventListener('lockehub-player-settings-updated', handleSettingsUpdated)
  }, [loadDelivered, loadTournament])

  const saveTournament = async (nextRounds: Round[], nextLocked = locked) => {
    if (!supabase || sessionId !== ORGANIZER_PLAYER_ID) return
    setSaving(true)
    const { error } = await supabase.from('torneo').upsert(
      {
        id: 1,
        sala_id: SALA_ID,
        bracket_data: nextRounds,
        is_locked: nextLocked,
        tournament_name: tournamentName.trim() || 'Torneo',
        max_participants: participants(nextRounds).length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    setSaving(false)
    if (error) {
      setMessage(`No se pudo guardar el torneo: ${error.message}`)
      return
    }
    setRounds(nextRounds)
    setLocked(nextLocked)
    setMessage('Cuadro guardado.')
  }

  const shuffle = () => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    const next = makeBracket(PLAYERS.map((player) => player.name), true)
    void saveTournament(next, false)
  }

  const clearBracket = () => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    void saveTournament([], false)
  }

  const moveSlot = (roundIndex: number, matchIndex: number, slot: 1 | 2) => {
    if (locked || sessionId !== ORGANIZER_PLAYER_ID || !dragged) return
    const next = structuredClone(rounds)
    const source = next[dragged.round].matches[dragged.match]
    const target = next[roundIndex].matches[matchIndex]
    const sourceKey = dragged.slot === 1 ? 'player1' : 'player2'
    const targetKey = slot === 1 ? 'player1' : 'player2'
    ;[source[sourceKey], target[targetKey]] = [target[targetKey], source[sourceKey]]
    setDragged(null)
    void saveTournament(next)
  }

  const selectWinner = (roundIndex: number, matchIndex: number, winner: string) => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    const next = structuredClone(rounds)
    const match = next[roundIndex].matches[matchIndex]
    match.winner = winner
    if (roundIndex + 1 < next.length) {
      const nextMatch = next[roundIndex + 1].matches[Math.floor(matchIndex / 2)]
      if (matchIndex % 2 === 0) nextMatch.player1 = winner
      else nextMatch.player2 = winner
    }
    void saveTournament(next)
  }

  const canSeeTeam = (name: string) => {
    const current = PLAYERS.find((player) => player.id === sessionId)?.name
    if (!current) return false
    if (current === name) return true
    return rivalFor(rounds, current) === name && allDelivered
  }

  const openTeam = async (name: string) => {
    if (!supabase || !canSeeTeam(name)) return
    const player = PLAYERS.find((item) => item.name === name)
    if (!player || sessionId === null) return

    if (player.id === sessionId) {
      const { data } = await supabase
        .from('directos')
        .select('pokepaste_text')
        .eq('jugador_id', player.id)
        .maybeSingle()
      if (data?.pokepaste_text) setTeamModal({ playerName: name, text: data.pokepaste_text })
      return
    }

    const { data, error } = await supabase.rpc('get_opponent_pokepaste', {
      p_player_id: sessionId,
      p_opponent_id: player.id,
    })
    const text = Array.isArray(data) ? data[0]?.pokepaste_text : null
    if (!error && text) setTeamModal({ playerName: name, text })
  }

  const participantIds = participants(rounds)
    .map((name) => PLAYERS.find((player) => player.name === name)?.id)
    .filter((id): id is number => id !== undefined)
  const allDelivered =
    participantIds.length > 0 && participantIds.every((id) => delivered.has(id))

  if (loading) return <p className="text-sm text-zinc-400">Cargando torneo…</p>

  return (
    <div className="space-y-6">
      {teamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Equipo de {teamModal.playerName}</h2>
              <button type="button" onClick={() => setTeamModal(null)} className="text-zinc-400">
                Cerrar
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-200">
              {teamModal.text}
            </pre>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(teamModal.text)}
              className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-zinc-950"
            >
              Copiar equipo
            </button>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400">Competición</p>
          <h1 className="text-3xl font-black">Torneo</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {allDelivered
              ? 'Todos los participantes han entregado su equipo.'
              : 'El botón VER EQUIPO se activará cuando todos hayan entregado su PokéPaste.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {sessionId === ORGANIZER_PLAYER_ID && (
            <>
              <label className="flex flex-col gap-1 text-xs font-bold text-zinc-400">
                Nombre del torneo
                <input
                  value={tournamentName}
                  onChange={(event) => setTournamentName(event.target.value)}
                  disabled={locked || saving}
                  placeholder="Ej. Copa Lockehub"
                  className="w-52 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal text-zinc-200"
                />
              </label>
              <button
                type="button"
                onClick={shuffle}
                disabled={locked || saving}
                className="rounded-lg border border-amber-500/50 px-3 py-2 text-sm font-bold text-amber-300 disabled:opacity-40"
              >
                Aleatorizar
              </button>
              <button
                type="button"
                onClick={clearBracket}
                disabled={saving}
                className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-bold text-rose-300 disabled:opacity-40"
              >
                Limpiar cuadro
              </button>
              <button
                type="button"
                onClick={() => void saveTournament(rounds, !locked)}
                disabled={saving}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 disabled:opacity-40"
              >
                {locked ? 'Desbloquear cuadro' : 'Bloquear cuadro'}
              </button>
            </>
          )}
          <Link href="/torneo/historial" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-teal-300">
            Historial
          </Link>
        </div>
      </header>

      {sessionId !== ORGANIZER_PLAYER_ID && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-400">
          Solo el organizador puede modificar el cuadro.
        </p>
      )}

      {message && <p className="text-sm text-teal-300">{message}</p>}

      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/sprites/lideres/1poster.png')" }}
        />
        <div className="absolute inset-0 bg-zinc-950/75" />
        <div className="relative overflow-x-auto p-6">
          {rounds.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-300">
              El cuadro está vacío.
            </p>
          ) : (
            <div className="flex min-w-max gap-10">
            {rounds.map((round, roundIndex) => (
              <section key={round.name} className="w-72 space-y-5">
              <h2 className="text-center text-base font-bold uppercase tracking-widest text-zinc-400">
                {round.name}
              </h2>
              <div className="space-y-5">
                {round.matches.map((match, matchIndex) => (
                  <div key={match.id} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                    {([1, 2] as const).map((slot) => {
                      const name = slot === 1 ? match.player1 : match.player2
                      const player = PLAYERS.find((item) => item.name === name)
                      const isWinner = match.winner === name
                      const hasPlayer = Boolean(name && name !== 'BYE')
                      return (
                        <div
                          key={slot}
                          draggable={Boolean(name && name !== 'BYE' && !locked && sessionId === ORGANIZER_PLAYER_ID)}
                          onDragStart={() => setDragged({ round: roundIndex, match: matchIndex, slot })}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => moveSlot(roundIndex, matchIndex, slot)}
                          className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-base transition ${
                            hasPlayer
                              ? isWinner
                                ? 'border-emerald-400/80 bg-emerald-500/20 font-black shadow-[0_0_18px_rgba(52,211,153,0.2)]'
                                : match.winner
                                  ? 'border-zinc-800 bg-zinc-950/40 opacity-35'
                                  : 'border-zinc-700 bg-zinc-950'
                              : 'border-dashed border-zinc-800 bg-zinc-900/40'
                          }`}
                        >
                          <span
                            className={name === 'BYE' ? 'text-zinc-600' : isWinner ? 'text-zinc-100' : 'text-zinc-400'}
                            style={player && hasPlayer ? { color: colors[player.id] || player.color } : undefined}
                          >
                            {name ?? 'Vacío'}
                          </span>
                          {hasPlayer && sessionId === ORGANIZER_PLAYER_ID && (
                            <button
                              type="button"
                              onClick={() => selectWinner(roundIndex, matchIndex, name!)}
                              className="text-[10px] font-black text-amber-300 hover:text-amber-200"
                            >
                              GANADOR
                            </button>
                          )}
                          {name && name !== 'BYE' && player && canSeeTeam(name) && (
                            <button
                              type="button"
                              onClick={() => void openTeam(name)}
                              className="text-[10px] font-black text-teal-300 hover:text-teal-200"
                            >
                              VER EQUIPO
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
              </section>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
