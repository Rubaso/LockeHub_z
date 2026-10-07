'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ORGANIZER_PLAYER_ID, PLAYERS, SALA_ID } from '@/lib/constants'
import { readAllSettings, readSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'

type Match = {
  id: string
  player1: string | null
  player2: string | null
  winner: string | null
  autoWinner?: boolean
  winnerTo?: MatchTarget
  loserTo?: MatchTarget
  loserRank?: number
}

type MatchTarget = {
  matchId: string
  slot: 1 | 2
}

type Round = {
  name: string
  matches: Match[]
  placementBracket?: boolean
}

type TeamModal = {
  playerName: string
  text: string
}

function placeLabel(rank: number) {
  return `${rank}.º`
}

function makeBracket(names: string[], randomize: boolean): Round[] {
  const rounds: Round[] = []
  let groupNumber = 0

  const buildGroup = (
    entries: (string | null)[],
    firstPlace: number,
    isMainBracket: boolean
  ): MatchTarget[] => {
    if (entries.length < 2) return []

    const groupId = groupNumber++
    const size = 2 ** Math.ceil(Math.log2(entries.length))
    const byeCount = size - entries.length
    const firstRoundPairs: (number | 'BYE')[][] = []
    let entryIndex = 0

    const playedMatchCount = size / 2 - byeCount
    for (let index = 0; index < playedMatchCount; index++) {
      firstRoundPairs.push([entryIndex++, entryIndex++])
    }
    for (let index = 0; index < byeCount; index++) {
      firstRoundPairs.push([entryIndex++, 'BYE'])
    }

    const inputTargets: MatchTarget[] = []
    const groupRounds: Round[] = []
    const loserGroups: { matches: Match[]; firstPlace: number }[] = []
    let current: (number | 'BYE' | object)[] = firstRoundPairs.flat()
    let roundNumber = 1

    while (current.length >= 2) {
      const finalRound = current.length === 2
      const matches: Match[] = Array.from({ length: current.length / 2 }, (_, index) => {
        const first = current[index * 2]
        const second = current[index * 2 + 1]
        const player1 = roundNumber === 1 && first !== 'BYE'
          ? isMainBracket ? entries[first as number] : null
          : first === 'BYE' ? 'BYE' : null
        const player2 = roundNumber === 1 && second !== 'BYE'
          ? isMainBracket ? entries[second as number] : null
          : second === 'BYE' ? 'BYE' : null
        if (roundNumber === 1) {
          if (first !== 'BYE') inputTargets[first as number] = { matchId: `g${groupId}-r1-m${index + 1}`, slot: 1 }
          if (second !== 'BYE') inputTargets[second as number] = { matchId: `g${groupId}-r1-m${index + 1}`, slot: 2 }
        }
        return {
          id: `g${groupId}-r${roundNumber}-m${index + 1}`,
          player1,
          player2,
          winner: null,
          autoWinner: player1 === 'BYE' || player2 === 'BYE',
        }
      })

      const roundName = finalRound
        ? isMainBracket
          ? 'Final'
          : `Puestos ${placeLabel(firstPlace)}-${placeLabel(firstPlace + 1)}`
        : isMainBracket
          ? `Ronda ${roundNumber}`
          : `Clasificación ${placeLabel(firstPlace)}-${placeLabel(firstPlace + entries.length - 1)} · Ronda ${roundNumber}`
      groupRounds.push({
        name: roundName,
        matches,
        placementBracket: !isMainBracket,
      })

      if (!finalRound) {
        let actualMatchCount = 0
        for (let index = 0; index < current.length; index += 2) {
          if (current[index] !== 'BYE' && current[index + 1] !== 'BYE') {
            actualMatchCount++
          }
        }
        const placementStart = firstPlace + matches.length
        if (actualMatchCount > 0 && placementStart <= 8) {
          loserGroups.push({
            matches: matches.filter((match) => !match.autoWinner),
            firstPlace: placementStart,
          })
        }
      }

      const next: (number | 'BYE' | object)[] = []
      for (let index = 0; index < current.length; index += 2) {
        if (current[index] === 'BYE') next.push(current[index + 1])
        else if (current[index + 1] === 'BYE') next.push(current[index])
        else next.push({})
      }

      if (!finalRound) {
        for (const [index, match] of matches.entries()) {
          match.winnerTo = {
            matchId: `g${groupId}-r${roundNumber + 1}-m${Math.floor(index / 2) + 1}`,
            slot: index % 2 === 0 ? 1 : 2,
          }
        }
      }

      current = next
      roundNumber++
    }

    rounds.push(...groupRounds)

    for (const loserGroup of loserGroups) {
      if (loserGroup.matches.length === 1) {
        loserGroup.matches[0].loserRank = loserGroup.firstPlace
        continue
      }
      const childEntries = Array.from({ length: loserGroup.matches.length }, () => null)
      const childTargets = buildGroup(childEntries, loserGroup.firstPlace, false)
      loserGroup.matches.forEach((match, index) => {
        match.loserTo = childTargets[index]
      })
    }

    return inputTargets
  }

  const participants = [...names]
  if (randomize) {
    for (let index = participants.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1))
      ;[participants[index], participants[other]] = [participants[other], participants[index]]
    }
  }
  buildGroup(participants, 1, true)
  propagateBracket(rounds)
  return rounds
}

function propagateBracket(rounds: Round[]) {
  const matches = new Map(rounds.flatMap((round) => round.matches.map((match) => [match.id, match] as const)))
  const pending = rounds.flatMap((round) => round.matches)
  const processed = new Set<string>()

  while (pending.length > 0) {
    const match = pending.shift()
    if (!match || processed.has(match.id)) continue
    processed.add(match.id)

    if (match.autoWinner) {
      match.winner = match.player1 === 'BYE'
        ? match.player2 && match.player2 !== 'BYE' ? match.player2 : null
        : match.player2 === 'BYE'
          ? match.player1 && match.player1 !== 'BYE' ? match.player1 : null
          : null
    } else if (match.winner !== match.player1 && match.winner !== match.player2) {
      match.winner = null
    }

    const loser = match.winner && !match.autoWinner
      ? match.player1 === match.winner ? match.player2 : match.player1
      : null
    for (const [target, playerName] of [[match.winnerTo, match.winner], [match.loserTo, loser]] as const) {
      if (!target?.matchId) continue
      const destination = matches.get(target.matchId)
      if (!destination) continue
      const key = target.slot === 1 ? 'player1' : 'player2'
      if (destination[key] !== playerName) {
        destination[key] = playerName
        destination.winner = null
        processed.delete(destination.id)
        pending.push(destination)
      }
    }
  }
}

type PositionOutcomes = {
  ranks: number[]
  outsideTopEight: boolean
}

function possiblePositions(
  matchId: string,
  playerName: string,
  matchMap: Map<string, { match: Match; round: Round }>,
  visited = new Set<string>()
): PositionOutcomes {
  if (visited.has(matchId)) return { ranks: [], outsideTopEight: false }
  const entry = matchMap.get(matchId)
  if (!entry) return { ranks: [], outsideTopEight: true }

  const { match, round } = entry
  const nextVisited = new Set(visited).add(matchId)
  const placementFinal = round.placementBracket && round.name.startsWith('Puestos ')
  const tournamentFinal = !round.placementBracket && round.name === 'Final'
  if (placementFinal || tournamentFinal) {
    const firstPlace = tournamentFinal
      ? 1
      : Number(round.name.match(/Puestos\s+(\d+)/)?.[1])
    if (!Number.isInteger(firstPlace) || firstPlace < 1) {
      return { ranks: [], outsideTopEight: true }
    }
    if (match.winner === playerName) return { ranks: [firstPlace], outsideTopEight: false }
    if (match.winner && (match.player1 === playerName || match.player2 === playerName)) {
      return { ranks: [firstPlace + 1], outsideTopEight: false }
    }
    if (match.winner) return { ranks: [], outsideTopEight: false }
    return {
      ranks: [firstPlace, firstPlace + 1].filter((rank) => rank <= 8),
      outsideTopEight: firstPlace + 1 > 8,
    }
  }

  const targets = match.winner
    ? [match.winner === playerName ? match.winnerTo : match.loserTo]
    : [match.winnerTo, match.loserTo]
  if (match.winner && match.winner !== playerName &&
      match.player1 !== playerName && match.player2 !== playerName) {
    return { ranks: [], outsideTopEight: false }
  }
  if (match.winner && match.winner !== playerName && match.loserRank &&
      (match.player1 === playerName || match.player2 === playerName)) {
    return {
      ranks: match.loserRank <= 8 ? [match.loserRank] : [],
      outsideTopEight: match.loserRank > 8,
    }
  }

  const outcomes = targets
    .filter((target): target is MatchTarget => Boolean(target))
    .map((target) => possiblePositions(target.matchId, playerName, matchMap, nextVisited))
  if (!match.winner && match.loserRank) {
    outcomes.push({
      ranks: match.loserRank <= 8 ? [match.loserRank] : [],
      outsideTopEight: match.loserRank > 8,
    })
  }
  return {
    ranks: outcomes.flatMap((outcome) => outcome.ranks),
    outsideTopEight: outcomes.some((outcome) => outcome.outsideTopEight) ||
      (!match.winner && !match.loserTo && !match.loserRank),
  }
}

function positionsByPlayer(rounds: Round[]) {
  const matchMap = new Map(
    rounds.flatMap((round) =>
      round.matches.map((match) => [match.id, { match, round }] as const)
    )
  )
  const positions = new Map<string, string>()
  const openingRound = rounds.find((round) => !round.placementBracket)

  for (const playerName of participants(rounds)) {
    const openingMatch = openingRound?.matches.find((match) =>
      match.player1 === playerName || match.player2 === playerName
    )
    if (!openingMatch) continue

    const outcomes = possiblePositions(openingMatch.id, playerName, matchMap)
    const ranks = [...new Set(outcomes.ranks)].sort((a, b) => a - b)
    if (ranks.length === 0) continue
    if (outcomes.outsideTopEight) {
      positions.set(playerName, 'Top 8 posible')
    } else if (ranks.length === 1) {
      positions.set(playerName, `${ranks[0]}.º`)
    } else {
      positions.set(playerName, `${ranks[0]}.º–${ranks[ranks.length - 1]}.º`)
    }
  }

  return positions
}

function playersWithCompletedMatches(rounds: Round[]) {
  return new Set(
    participants(rounds).filter((playerName) => {
      const matches = rounds.flatMap((round) =>
        round.matches.filter((match) =>
          match.player1 === playerName || match.player2 === playerName
        )
      )
      return matches.length > 0 && matches.every((match) =>
        match.autoWinner || Boolean(match.winner)
      )
    })
  )
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
  const [teamCopied, setTeamCopied] = useState(false)
  const [clipboardError, setClipboardError] = useState('')
  const loadTournament = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('torneo')
      .select('bracket_data, is_locked, tournament_name')
      .eq('sala_id', SALA_ID)
      .maybeSingle()

    if (data?.bracket_data) {
      const loadedRounds = data.bracket_data as Round[]
      setRounds(loadedRounds)
    } else {
      setRounds([])
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

  const toggleWinner = (roundIndex: number, matchIndex: number, playerName: string) => {
    if (sessionId !== ORGANIZER_PLAYER_ID) return
    const next = structuredClone(rounds)
    const match = next[roundIndex].matches[matchIndex]
    match.winner = match.winner === playerName ? null : playerName

    const hasPlacementLinks = next.some((round) =>
      round.placementBracket || round.matches.some((item) =>
        item.autoWinner || item.winnerTo || item.loserTo
      )
    )

    if (hasPlacementLinks) {
      propagateBracket(next)
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

  const participantIds = participants(rounds)
    .map((name) => PLAYERS.find((player) => player.name === name)?.id)
    .filter((id): id is number => id !== undefined)
  const allDelivered =
    participantIds.length > 0 && participantIds.every((id) => delivered.has(id))
  const playerPositions = positionsByPlayer(rounds)
  const finishedPlayers = playersWithCompletedMatches(rounds)
  const mainRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => !round.placementBracket)
  const placementRounds = rounds
    .map((round, index) => ({ round, index }))
    .filter(({ round }) => round.placementBracket)
  const placementGroups = Array.from(
    placementRounds.reduce((groups, entry) => {
      const start = Number(entry.round.name.match(/(?:Clasificación|Puestos)\s+(\d+)/)?.[1])
      if (!Number.isInteger(start)) return groups
      const group = groups.get(start) ?? []
      group.push(entry)
      groups.set(start, group)
      return groups
    }, new Map<number, typeof placementRounds>())
  ).sort(([a], [b]) => a - b)

  const rankForPlayer = (name: string) => {
    if (!finishedPlayers.has(name)) return null
    const rank = Number(playerPositions.get(name)?.match(/^(\d+)\.º$/)?.[1])
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
                      const rank = Number(position?.match(/^(\d+)\.º$/)?.[1])
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
                          title={`Puesto ${rank}.º`}
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
            Se jugarán partidos de clasificación hasta decidir el 8.º puesto.
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
        <div className="relative overflow-x-auto p-4">
          {rounds.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-300">
              El cuadro está vacío.
            </p>
          ) : (
            <div className="flex min-w-max items-start gap-2">
            {mainRounds.map(({ round, index: roundIndex }) => (
              round.name === 'Final' ? (
                <div key={`${round.name}-${roundIndex}`} className="flex w-60 flex-col gap-2">
                  {renderRound(round, roundIndex)}
                  {placementGroups.length > 0 && (
                    <div className="mt-12 space-y-2">
                      {placementGroups.map(([start, groupRounds]) => (
                        <section
                          key={`placement-${start}`}
                          className="grid w-max grid-cols-2 items-start gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/55 p-2"
                        >
                          {groupRounds.map(({ round: placementRound, index }, roundInGroup) =>
                              renderRound(
                                placementRound,
                                index,
                                placementRound.name.startsWith('Puestos ')
                                  ? placementRound.name
                                    .replace(/^Puestos\s+/, '')
                                    .replace('-', '–')
                                  : roundInGroup === 0
                                    ? `Top ${placementRound.name.match(/(\d+\.º-\d+\.º)/)?.[1]?.replace('-', '–') ?? '8'}`
                                    : `Ronda ${roundInGroup + 1}`
                              )
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              ) : renderRound(round, roundIndex)
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
