export type MatchTarget = {
  matchId: string
  slot: 1 | 2
}

export type Match = {
  id: string
  player1: string | null
  player2: string | null
  winner: string | null
  autoWinner?: boolean
  winnerTo?: MatchTarget
  loserTo?: MatchTarget
  resetToMatchId?: string
  loserRankRange?: [number, number]
}

export type Round = {
  name: string
  matches: Match[]
  bracketType: 'winners' | 'losers' | 'final'
  resetFinal?: boolean
}

type BracketEntry = {
  match: Match
  result: 'winner' | 'loser'
}

function rankRange(count: number, end: number): [number, number] {
  return [end - count + 1, end]
}

export function makeBracket(names: string[], randomize: boolean): Round[] {
  if (names.length < 2) return []

  const participants = [...names]
  if (randomize) {
    for (let index = participants.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1))
      ;[participants[index], participants[other]] = [participants[other], participants[index]]
    }
  }

  const bracketSize = 2 ** Math.ceil(Math.log2(participants.length))
  const byeCount = bracketSize - participants.length
  const firstRoundMatchCount = bracketSize / 2
  const playedMatchCount = firstRoundMatchCount - byeCount
  const firstRoundPairs: [string | 'BYE', string | 'BYE'][] = []
  let participantIndex = 0

  for (let index = 0; index < playedMatchCount; index++) {
    firstRoundPairs.push([
      participants[participantIndex++],
      participants[participantIndex++],
    ])
  }
  for (let index = 0; index < byeCount; index++) {
    firstRoundPairs.push([participants[participantIndex++], 'BYE'])
  }

  const winnersRounds: Round[] = []
  let matchCount = firstRoundMatchCount
  let roundNumber = 1

  while (matchCount >= 1) {
    const matches: Match[] = Array.from({ length: matchCount }, (_, index) => {
      const pair = roundNumber === 1 ? firstRoundPairs[index] : undefined
      const player1 = pair?.[0] ?? null
      const player2 = pair?.[1] ?? null
      return {
        id: `w-r${roundNumber}-m${index + 1}`,
        player1,
        player2,
        winner: null,
        autoWinner: player1 === 'BYE' || player2 === 'BYE',
      }
    })

    winnersRounds.push({
      name: roundNumber === 1 ? 'Winners · Ronda 1' :
        matchCount === 1 ? 'Winners · Final' : `Winners · Ronda ${roundNumber}`,
      matches,
      bracketType: 'winners',
    })

    if (matchCount === 1) break
    const nextMatchCount = matchCount / 2
    matches.forEach((match, index) => {
      match.winnerTo = {
        matchId: `w-r${roundNumber + 1}-m${Math.floor(index / 2) + 1}`,
        slot: index % 2 === 0 ? 1 : 2,
      }
    })
    matchCount = nextMatchCount
    roundNumber++
  }

  const losersRounds: Round[] = []
  let previousLosers: MatchTarget[] = []
  let losersRoundNumber = 1

  const buildLosersRound = (entries: BracketEntry[]) => {
    if (entries.length === 0) return [] as Match[]

    const hasBye = entries.length % 2 === 1
    const pairs: (BracketEntry | null)[][] = []
    let entryIndex = 0

    if (hasBye) {
      pairs.push([entries[entryIndex++], null])
    }
    while (entryIndex < entries.length) {
      pairs.push([entries[entryIndex++], entries[entryIndex++]])
    }

    const matches = pairs.map(([first, second], index): Match => {
      const match: Match = {
        id: `l-r${losersRoundNumber}-m${index + 1}`,
        player1: null,
        player2: second ? null : 'BYE',
        winner: null,
        autoWinner: !second,
      }
      for (const [entry, slot] of [[first, 1], [second, 2]] as const) {
        if (!entry) continue
        const target = { matchId: match.id, slot }
        if (entry.result === 'winner') entry.match.winnerTo = target
        else entry.match.loserTo = target
      }
      return match
    })

    losersRounds.push({
      name: `Losers · Ronda ${losersRoundNumber}`,
      matches,
      bracketType: 'losers',
    })
    losersRoundNumber++
    return matches
  }

  for (const [winnersRoundIndex, winnersRound] of winnersRounds.entries()) {
    const droppedMatches = winnersRound.matches.filter((match) => !match.autoWinner)
    const droppedEntries = droppedMatches.map(
      (match): BracketEntry => ({ match, result: 'loser' })
    )

    if (winnersRoundIndex === 0) {
      previousLosers = buildLosersRound(droppedEntries).map((match) => ({
        matchId: match.id,
        slot: 1,
      }))
      continue
    }

    if (previousLosers.length > 1) {
      const consolidationMatches = buildLosersRound(
        previousLosers.map((target): BracketEntry => ({
          match: winnersRounds
            .flatMap((round) => round.matches)
            .concat(losersRounds.flatMap((round) => round.matches))
            .find((match) => match.id === target.matchId)!,
          result: 'winner',
        }))
      )
      previousLosers = consolidationMatches.map((match) => ({
        matchId: match.id,
        slot: 1,
      }))
    }

    const previousMatches = previousLosers.map(
      (target): BracketEntry => ({
        match: losersRounds.flatMap((round) => round.matches)
          .find((match) => match.id === target.matchId)!,
        result: 'winner',
      })
    )
    previousLosers = buildLosersRound([
      ...previousMatches,
      ...droppedEntries,
    ]).map((match) => ({
      matchId: match.id,
      slot: 1,
    }))
  }

  const losersMatchById = new Map(
    losersRounds.flatMap((round) => round.matches.map((match) => [match.id, match] as const))
  )
  const losersStageCounts = losersRounds.map((round) =>
    round.matches.filter((match) => !match.autoWinner).length
  )
  let rankEnd = participants.length
  for (let index = 0; index < losersRounds.length; index++) {
    const eliminated = losersStageCounts[index]
    if (eliminated === 0) continue
    const range = rankRange(eliminated, rankEnd)
    for (const match of losersRounds[index].matches) {
      if (!match.autoWinner) match.loserRankRange = range
    }
    rankEnd -= eliminated
  }

  const grandFinal = {
    id: 'gf-m1',
    player1: null,
    player2: null,
    winner: null,
    resetToMatchId: 'gf-reset-m1',
  } satisfies Match
  const resetFinal: Match = {
    id: 'gf-reset-m1',
    player1: null,
    player2: null,
    winner: null,
  }
  const winnersFinal = winnersRounds[winnersRounds.length - 1].matches[0]
  const losersFinal = previousLosers.length === 1
    ? losersMatchById.get(previousLosers[0].matchId)
    : undefined
  if (!losersFinal) {
    const lastLosersRound = losersRounds[losersRounds.length - 1]
    const lastLosersMatch = lastLosersRound?.matches[0]
    if (lastLosersMatch) {
      lastLosersMatch.winnerTo = { matchId: grandFinal.id, slot: 2 }
    }
  } else {
    losersFinal.winnerTo = { matchId: grandFinal.id, slot: 2 }
  }
  winnersFinal.winnerTo = { matchId: grandFinal.id, slot: 1 }

  const finalRounds: Round[] = [
    { name: 'Gran Final', matches: [grandFinal], bracketType: 'final' },
    {
      name: 'Final de reinicio',
      matches: [resetFinal],
      bracketType: 'final',
      resetFinal: true,
    },
  ]
  const rounds = [...winnersRounds, ...losersRounds, ...finalRounds]
  propagateBracket(rounds)
  return rounds
}

export function propagateBracket(rounds: Round[]) {
  const matches = new Map(
    rounds.flatMap((round) => round.matches.map((match) => [match.id, match] as const))
  )
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
    for (const [target, playerName] of [
      [match.winnerTo, match.winner],
      [match.loserTo, loser],
    ] as const) {
      if (!target) continue
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

    if (match.resetToMatchId) {
      const reset = matches.get(match.resetToMatchId)
      if (!reset) continue
      const needsReset = match.winner === match.player2
      const player1 = needsReset ? match.player1 : null
      const player2 = needsReset ? match.player2 : null
      if (reset.player1 !== player1 || reset.player2 !== player2) {
        reset.player1 = player1
        reset.player2 = player2
        reset.winner = null
        processed.delete(reset.id)
        pending.push(reset)
      }
    }
  }
}

type PositionOutcomes = { ranks: number[] }

function possiblePositions(
  matchId: string,
  playerName: string,
  matchMap: Map<string, { match: Match; round: Round }>,
  visited = new Set<string>()
): PositionOutcomes {
  if (visited.has(matchId)) return { ranks: [] }
  const entry = matchMap.get(matchId)
  if (!entry) return { ranks: [] }

  const { match, round } = entry
  const isParticipant = match.player1 === playerName || match.player2 === playerName
  if (!isParticipant) return { ranks: [] }

  const nextVisited = new Set(visited).add(matchId)

  if (round.bracketType === 'final') {
    if (round.resetFinal) {
      if (match.player1 === null || match.player2 === null) return { ranks: [] }
      if (!match.winner) return { ranks: [1, 2] }
      return { ranks: [match.winner === playerName ? 1 : 2] }
    }
    if (match.winner === match.player1) {
      return { ranks: [match.winner === playerName ? 1 : 2] }
    }
    if (match.winner === match.player2 || !match.winner) {
      return match.resetToMatchId
        ? possiblePositions(match.resetToMatchId, playerName, matchMap, nextVisited)
        : { ranks: [1, 2] }
    }
    return { ranks: [] }
  }

  if (match.winner) {
    if (match.winner === playerName && match.winnerTo) {
      return possiblePositions(match.winnerTo.matchId, playerName, matchMap, nextVisited)
    }
    if (match.winner !== playerName && match.loserTo) {
      return possiblePositions(match.loserTo.matchId, playerName, matchMap, nextVisited)
    }
    if (match.winner !== playerName && match.loserRankRange) {
      const [first, last] = match.loserRankRange
      return { ranks: Array.from({ length: last - first + 1 }, (_, index) => first + index) }
    }
    return { ranks: [] }
  }

  const outcomes: PositionOutcomes[] = []
  for (const target of [match.winnerTo, match.loserTo]) {
    if (target) {
      outcomes.push(possiblePositions(target.matchId, playerName, matchMap, nextVisited))
    }
  }
  if (match.loserRankRange && !match.autoWinner) {
    const [first, last] = match.loserRankRange
    outcomes.push({
      ranks: Array.from({ length: last - first + 1 }, (_, index) => first + index),
    })
  }
  return { ranks: outcomes.flatMap((outcome) => outcome.ranks) }
}

export function positionsByPlayer(rounds: Round[]) {
  const matchMap = new Map(
    rounds.flatMap((round) =>
      round.matches.map((match) => [match.id, { match, round }] as const)
    )
  )
  const positions = new Map<string, string>()
  const firstRound = rounds.find(
    (round) => round.bracketType === 'winners' && round.name.endsWith('Ronda 1')
  )

  for (const playerName of participants(rounds)) {
    const openingMatch = firstRound?.matches.find((match) =>
      match.player1 === playerName || match.player2 === playerName
    )
    if (!openingMatch) continue

    const outcomes = possiblePositions(openingMatch.id, playerName, matchMap)
    const ranks = [...new Set(outcomes.ranks)].sort((a, b) => a - b)
    if (ranks.length === 0) continue
    positions.set(
      playerName,
      ranks.length === 1
        ? `${ranks[0]}.º`
        : `${ranks[0]}.º–${ranks[ranks.length - 1]}.º`
    )
  }

  return positions
}

export function playersWithCompletedMatches(rounds: Round[]) {
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

export function participants(rounds: Round[]) {
  const firstRound = rounds.find(
    (round) => round.bracketType === 'winners' && round.name.endsWith('Ronda 1')
  )
  return Array.from(
    new Set(
      (firstRound?.matches ?? []).flatMap((match) =>
        [match.player1, match.player2].filter(
          (name): name is string => Boolean(name && name !== 'BYE')
        )
      )
    )
  )
}
