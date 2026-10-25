'use client'

import { useCallback, useEffect, useState } from 'react'
import { ORGANIZER_PLAYER_ID, PLAYERS, SALA_ID } from '@/lib/constants'
import { readAllSettings, readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import {
  makeBracket as makeDoubleEliminationBracket,
  participants as getParticipants,
  playersWithCompletedMatches as getCompletedPlayers,
  positionsByPlayer as getPositionsByPlayer,
  propagateBracket as propagateDoubleElimination,
  type Round as BracketRound,
} from '@/lib/tournamentBracket'

type Round = BracketRound

type TeamModal = {
  playerName: string
  text: string
}

function rivalFor(rounds: Round[], playerName: string) {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.winner || match.autoWinner) continue
      if (match.player1 === playerName && match.player2 && match.player2 !== 'BYE') return match.player2
      if (match.player2 === playerName && match.player1 && match.player1 !== 'BYE') return match.player1
    }
  }
  return null
}

export default function TorneoPage() {
  const [rounds, setRounds] = useState<Round[]>([])
  const [locked, setLocked] = useState(false)
  const [tournamentName, setTournamentName] = useState('')
  const [tournamentKey, setTournamentKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dragged, setDragged] = useState<{ round: number; match: number; slot: 1 | 2 } | null>(null)
  const [delivered, setDelivered] = useState<Set<number>>(new Set())
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [teamModal, setTeamModal] = useState<TeamModal | null>(null)
  const [teamLoading, setTeamLoading] = useState<string | null>(null)
  const [teamError, setTeamError] = useState('')
  const [colors, setColors] = useState<Record<number, string>>({})
  const [teamCopied, setTeamCopied] = useState(false)
  const [clipboardError, setClipboardError] = useState('')
  const loadTournament = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('torneo')
      .select('bracket_data, is_locked, tournament_name, tournament_key')
      .eq('sala_id', SALA_ID)
      .maybeSingle()

    if (data?.bracket_data) {
      const loadedRounds = data.bracket_data as Round[]
      setRounds(loadedRounds)
      setTournamentKey(data.tournament_key ?? null)
    } else {
      setRounds([])
      setTournamentKey(null)
    }
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

  const saveTournament = async (
    nextRounds: Round[],
    nextLocked = locked,
    nextTournamentKey = tournamentKey ?? crypto.randomUUID(),
    archive = false
  ) => {
    if (!supabase || sessionId !== ORGANIZER_PLAYER_ID) return
    setSaving(true)
    const { error } = await supabase.from('torneo').upsert(
      {
        id: 1,
        sala_id: SALA_ID,
        tournament_key: nextTournamentKey,
        bracket_data: nextRounds,
        is_locked: nextLocked,
        tournament_name: tournamentName.trim() || 'Torneo',
        max_participants: getParticipants(nextRounds).length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    if (error) {
      setSaving(false)
      setMessage(`No se pudo guardar el torneo: ${error.message}`)
      return
    }

    if (archive) {
      const positions = getPositionsByPlayer(nextRounds)
      const positionRows = getParticipants(nextRounds)
        .map((playerName) => ({
          player_name: playerName,
          position: positions.get(playerName) ?? 'Por determinar',
        }))
        .sort((a, b) => {
          const rankA = Number(a.position.match(/^(\d+)\.º/)?.[1])
          const rankB = Number(b.position.match(/^(\d+)\.º/)?.[1])
          if (Number.isInteger(rankA) && Number.isInteger(rankB)) return rankA - rankB
          if (Number.isInteger(rankA)) return -1
          if (Number.isInteger(rankB)) return 1
          return a.player_name.localeCompare(b.player_name, 'es')
        })
      const champion = positionRows.find((entry) => entry.position === '1.º')?.player_name
      const { error: historyError } = await supabase
        .from('torneo_ediciones')
        .upsert(
          {
            tournament_key: nextTournamentKey,
            sala_id: SALA_ID,
            tournament_name: tournamentName.trim() || 'Torneo',
            champion: champion ?? 'Por determinar',
            max_participants: getParticipants(nextRounds).length,
            bracket_data: nextRounds,
            positions: positionRows,
          },
          { onConflict: 'tournament_key' }
        )

      if (historyError) {
        setSaving(false)
        setMessage(`El cuadro se guardó, pero no se pudo archivar: ${historyError.message}`)
        setRounds(nextRounds)
        setLocked(nextLocked)
        setTournamentKey(nextTournamentKey)
        return
      }
    }

    setRounds(nextRounds)
    setLocked(nextLocked)
    setTournamentKey(nextTournamentKey)
    setMessage(archive ? 'Torneo y posiciones guardados en el historial.' : 'Torneo y posiciones guardados.')
    setSaving(false)
  }

  const shuffle = () => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    const next = makeDoubleEliminationBracket(PLAYERS.map((player) => player.name), true)
    void saveTournament(next, false, crypto.randomUUID())
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
    propagateDoubleElimination(next)
    setDragged(null)
    void saveTournament(next)
  }

  const toggleWinner = (roundIndex: number, matchIndex: number, playerName: string) => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    const next = structuredClone(rounds)
    const match = next[roundIndex].matches[matchIndex]
    match.winner = match.winner === playerName ? null : playerName

    const hasBracketLinks = next.some((round) =>
      round.matches.some((item) =>
        item.autoWinner || item.winnerTo || item.loserTo || item.resetToMatchId
      )
    )

    if (hasBracketLinks) {
      propagateDoubleElimination(next)
    } else {
      let sourceMatchIndex = matchIndex
      let advancedPlayer = match.winner
      for (let nextRoundIndex = roundIndex + 1; nextRoundIndex < next.length; nextRoundIndex++) {
        const nextMatchIndex = Math.floor(sourceMatchIndex / 2)
        const nextMatch = next[nextRoundIndex].matches[nextMatchIndex]
        if (!nextMatch) break

        const slot = sourceMatchIndex % 2 === 0 ? 'player1' : 'player2'
        if (nextMatch[slot] === advancedPlayer) break

        nextMatch[slot] = advancedPlayer
        if (!nextMatch.winner) break

        nextMatch.winner = null
        advancedPlayer = null
        sourceMatchIndex = nextMatchIndex
      }
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
    setTeamCopied(false)
    setClipboardError('')
    setTeamError('')
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

    setTeamLoading(name)
    try {
      const { data, error } = await supabase
        .from('directos')
        .select('pokepaste_text')
        .eq('jugador_id', player.id)
        .maybeSingle()

      if (error) throw error
      const text = data?.pokepaste_text?.trim()
      if (!text) {
        setTeamError(`El PokéPaste público de ${name} no está disponible.`)
        return
      }
      setTeamModal({ playerName: name, text })
    } catch (error) {
      console.error('No se pudo cargar el PokéPaste del rival:', error)
      setTeamError(`No se pudo cargar el equipo de ${name}.`)
    } finally {
      setTeamLoading(null)
    }
  }

  const copyTeam = async () => {
    if (!teamModal) return
    try {
      await navigator.clipboard.writeText(teamModal.text)
      setClipboardError('')
      setTeamCopied(true)
      window.setTimeout(() => setTeamCopied(false), 2500)
    } catch {
      setClipboardError('No se pudo copiar el equipo. Comprueba los permisos del navegador.')
    }
  }

  const participantIds = getParticipants(rounds)
    .map((name) => PLAYERS.find((player) => player.name === name)?.id)
    .filter((id): id is number => id !== undefined)
  const allDelivered =
    participantIds.length > 0 && participantIds.every((id) => delivered.has(id))
  const playerPositions = getPositionsByPlayer(rounds)
  const finishedPlayers = getCompletedPlayers(rounds)
  const winnersRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => round.bracketType === 'winners')
  const losersRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => round.bracketType === 'losers')
  const finalRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => round.bracketType === 'final')
  const resetFinalIsActive = finalRounds.some(({ round }) =>
    round.resetFinal && round.matches.some((match) => Boolean(match.player1 && match.player2))
  )

  const rankForPlayer = (name: string) => {
    if (!finishedPlayers.has(name)) return null
    const rank = Number(playerPositions.get(name)?.match(/^(\d+)\.º/)?.[1])
    return Number.isInteger(rank) && rank >= 1 && rank <= 8 ? rank : null
  }

  const renderRound = (
    round: Round,
    roundIndex: number,
    title = round.name
  ) => (
    <section
      key={`${round.name}-${roundIndex}`}
      className="w-60 rounded-xl bg-zinc-950/45 p-1.5"
    >
      <div className="mb-1.5 flex min-h-10 items-center justify-center rounded-lg border border-amber-400/15 bg-amber-500/10 px-2 py-1.5 text-center">
        <h2 className="text-sm font-black uppercase tracking-wide text-amber-100">
          {title}
        </h2>
      </div>
      <div className="space-y-1.5">
        {round.matches.map((match, matchIndex) => (
          <div key={match.id} className="relative space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-900/90 p-1.5">
            {([1, 2] as const).map((slot) => {
              const name = slot === 1 ? match.player1 : match.player2
              const player = PLAYERS.find((item) => item.name === name)
              const isWinner = match.winner === name
              const hasPlayer = Boolean(name && name !== 'BYE')
              const rank = name ? rankForPlayer(name) : null
              const medalStyle = rank === 1
                ? 'border-amber-400/80 bg-amber-400/20 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
                : rank === 2
                  ? 'border-slate-300/80 bg-slate-300/20 shadow-[0_0_12px_rgba(203,213,225,0.18)]'
                  : rank === 3
                    ? 'border-orange-500/80 bg-orange-700/25 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                    : null
              return (
                <div
                  key={slot}
                  draggable={Boolean(name && name !== 'BYE' && !locked && sessionId === ORGANIZER_PLAYER_ID)}
                  onDragStart={() => setDragged({ round: roundIndex, match: matchIndex, slot })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveSlot(roundIndex, matchIndex, slot)}
                  className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition ${
                    hasPlayer
                      ? medalStyle
                        ? `${medalStyle} font-black`
                        : isWinner
                        ? 'border-emerald-400/80 bg-emerald-500/20 font-black shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                        : match.winner
                          ? 'border-zinc-800 bg-zinc-950/40 opacity-35'
                          : 'border-zinc-700 bg-zinc-950'
                      : 'border-dashed border-zinc-800 bg-zinc-900/40'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!hasPlayer || match.autoWinner || sessionId !== ORGANIZER_PLAYER_ID || saving}
                      aria-pressed={isWinner}
                      title={isWinner ? 'Quitar como ganador' : 'Marcar como ganador'}
                      onClick={() => {
                        if (name && name !== 'BYE') toggleWinner(roundIndex, matchIndex, name)
                      }}
                      className={`truncate text-left ${name === 'BYE' ? 'text-zinc-600' : isWinner ? 'font-black text-zinc-100' : 'text-zinc-400'} disabled:cursor-default`}
                      style={player && hasPlayer ? { color: colors[player.id] || player.color } : undefined}
                    >
                      {name ?? 'Vacío'}
                    </button>
                    {name && finishedPlayers.has(name) && (() => {
                      const position = playerPositions.get(name)
                      const rank = Number(position?.match(/^(\d+)\.º/)?.[1])
                      if (!Number.isInteger(rank) || rank < 1 || rank > 8) return null

                      const medalColor = rank === 1
                        ? 'bg-amber-400/20 text-amber-300'
                        : rank === 2
                          ? 'bg-slate-300/20 text-slate-200'
                          : rank === 3
                            ? 'bg-orange-700/25 text-orange-300'
                            : 'bg-zinc-700/40 text-zinc-300'
                      return (
                        <span
                          title={`Puesto ${position}`}
                          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${medalColor}`}
                        >
                          {position}
                        </span>
                      )
                    })()}
                  </div>
                  {name && name !== 'BYE' && player && canSeeTeam(name) && (
                    <button
                      type="button"
                      disabled={teamLoading !== null}
                      onClick={() => void openTeam(name)}
                      className="text-[10px] font-black text-teal-300 hover:text-teal-200 disabled:cursor-wait disabled:opacity-50"
                    >
                      {teamLoading === name ? 'CARGANDO…' : 'VER EQUIPO'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )

  if (loading) return <p className="text-sm text-zinc-400">Cargando torneo…</p>

  return (
    <div className="space-y-6">
      {teamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Equipo de {teamModal.playerName}</h2>
              <button type="button" onClick={() => { setTeamModal(null); setTeamCopied(false); setClipboardError('') }} className="text-zinc-400">
                Cerrar
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-200">
              {teamModal.text}
            </pre>
            <button
              type="button"
              onClick={() => void copyTeam()}
              className={`mt-4 rounded-lg px-4 py-2 text-sm font-bold transition ${
                teamCopied
                  ? 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                  : 'bg-teal-500 text-zinc-950 hover:bg-teal-400'
              }`}
            >
              {teamCopied ? '✓ Equipo copiado' : 'Copiar equipo'}
            </button>
            {clipboardError && <p role="alert" className="mt-2 text-sm text-rose-300">{clipboardError}</p>}
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
          <p className="mt-1 text-xs text-zinc-500">
            Doble eliminación: quien pierde en winners pasa a losers. En la Gran Final, el finalista de winners debe perder dos veces.
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
                onClick={() => void saveTournament(rounds, locked, tournamentKey ?? crypto.randomUUID(), true)}
                disabled={saving}
                className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-bold text-zinc-950 disabled:opacity-40"
              >
                {saving ? 'Guardando…' : 'Guardar torneo y posiciones'}
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
          <a href="/torneo/historial" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-teal-300">
            Historial
          </a>
        </div>
      </header>

      {sessionId !== ORGANIZER_PLAYER_ID && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-400">
          Solo el organizador puede modificar el cuadro.
        </p>
      )}

      {message && <p className="text-sm text-teal-300">{message}</p>}
      {teamError && <p role="alert" className="text-sm text-rose-300">{teamError}</p>}

      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/sprites/lideres/1poster.png')" }}
        />
        <div className="absolute inset-0 bg-zinc-950/75" />
        <div className="relative space-y-6 overflow-x-auto p-4">
          {rounds.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-300">
              El cuadro está vacío.
            </p>
          ) : (
            <div className="grid w-max min-w-full grid-cols-[max-content_max-content] grid-rows-[auto_auto] items-start gap-x-4 gap-y-6">
              {winnersRounds.length > 0 && (
                <section className="col-start-1 row-start-1 space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-teal-300">
                    Cuadro de winners
                  </h2>
                  <div className="flex min-w-max items-start gap-2">
                    {winnersRounds.map(({ round, index }) => renderRound(round, index))}
                    {finalRounds.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {finalRounds
                          .filter(({ round }) => !round.resetFinal || resetFinalIsActive)
                          .map(({ round, index }) => renderRound(round, index))}
                      </div>
                    )}
                  </div>
                </section>
              )}
              {losersRounds.length > 0 && (
                <section className="col-start-1 row-start-2 space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-widest text-rose-300">
                    Cuadro de losers
                  </h2>
                  <div className="flex min-w-max items-start gap-2">
                    {losersRounds.map(({ round, index }) => renderRound(round, index))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
