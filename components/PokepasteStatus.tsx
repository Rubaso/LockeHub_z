'use client'

import { useCallback, useEffect, useState } from 'react'
import { PLAYERS, SALA_ID } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { readSession } from '@/lib/session'

type Match = {
  player1: string | null
  player2: string | null
  winner?: string | null
  autoWinner?: boolean
}
type Round = { matches?: Match[]; placementBracket?: boolean }
type DirectoRow = { jugador_id: number; pokepaste_text: string | null }

function findRival(rounds: Round[], playerName: string) {
  const firstRound = rounds.find((round) => !round.placementBracket)
  const firstMatch = firstRound?.matches?.find((match) =>
    match.player1 === playerName || match.player2 === playerName
  )
  if (
    firstMatch?.winner &&
    firstMatch.winner !== playerName &&
    (firstMatch.player1 === playerName || firstMatch.player2 === playerName)
  ) {
    return null
  }

  for (const round of rounds) {
    for (const match of round.matches ?? []) {
      if (match.winner || match.autoWinner) continue
      if (match.player1 === playerName && match.player2 && match.player2 !== 'BYE') return match.player2
      if (match.player2 === playerName && match.player1 && match.player1 !== 'BYE') return match.player1
    }
  }
  return null
}

export default function PokepasteStatus() {
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [pokepaste, setPokepaste] = useState('')
  const [savedPokepaste, setSavedPokepaste] = useState('')
  const [rivalName, setRivalName] = useState<string | null>(null)
  const [isParticipant, setIsParticipant] = useState(false)
  const [rivalPokepaste, setRivalPokepaste] = useState('')
  const [allDelivered, setAllDelivered] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copiedOwn, setCopiedOwn] = useState(false)
  const [copiedRival, setCopiedRival] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    if (!supabase) {
      setError('No hay conexión configurada con Supabase.')
      setLoading(false)
      return
    }

    const session = readSession()
    const player = session ? PLAYERS.find((item) => item.id === session.id) : null
    if (!session || !player) {
      setPlayerId(null)
      setLoading(false)
      return
    }

    setPlayerId(player.id)
    const [ownResult, tournamentResult, deliveredResult] = await Promise.all([
      supabase.from('directos').select('jugador_id, pokepaste_text').eq('jugador_id', player.id).maybeSingle(),
      supabase.from('torneo').select('bracket_data').eq('sala_id', SALA_ID).maybeSingle(),
      supabase.from('directos').select('jugador_id, pokepaste_text'),
    ])

    if (ownResult.error) setError('No se pudo cargar tu PokéPaste.')
    else {
      const saved = (ownResult.data as DirectoRow | null)?.pokepaste_text ?? ''
      setPokepaste(saved)
      setSavedPokepaste(saved)
    }

    const rounds = (tournamentResult.data?.bracket_data ?? []) as Round[]
    const nextRivalName = findRival(rounds, player.name)
    setRivalName(nextRivalName)
    const participantNames = (rounds[0]?.matches ?? [])
      .flatMap((match) => [match.player1, match.player2])
      .filter((name): name is string => Boolean(name && name !== 'BYE'))
    setIsParticipant(participantNames.includes(player.name))
    setRivalPokepaste('')

    const participantIds = (rounds[0]?.matches ?? [])
      .flatMap((match) => [match.player1, match.player2])
      .filter((name): name is string => Boolean(name && name !== 'BYE'))
      .map((name) => PLAYERS.find((item) => item.name === name)?.id)
      .filter((id): id is number => id !== undefined)
    const deliveredIds = new Set(
      (deliveredResult.data ?? [])
        .filter((row) => Boolean(row.pokepaste_text?.trim()))
        .map((row) => row.jugador_id)
    )
    const everyoneDelivered = participantIds.length > 0 && participantIds.every((id) => deliveredIds.has(id))
    setAllDelivered(everyoneDelivered)

    if (nextRivalName && everyoneDelivered && ownResult.data?.pokepaste_text) {
      const rival = PLAYERS.find((item) => item.name === nextRivalName)
      if (rival) {
        const { data, error: rivalError } = await supabase
          .from('directos')
          .select('pokepaste_text')
          .eq('jugador_id', rival.id)
          .maybeSingle()
        if (rivalError) {
          console.error('No se pudo cargar el PokéPaste del rival:', rivalError)
          setError('No se pudo cargar el PokéPaste del rival.')
        } else {
          setRivalPokepaste(data?.pokepaste_text?.trim() ?? '')
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const copyOwnPokepaste = async () => {
    if (!pokepaste) return
    await navigator.clipboard.writeText(pokepaste)
    setCopiedOwn(true)
    window.setTimeout(() => setCopiedOwn(false), 2000)
  }

  const copyRivalPokepaste = async () => {
    if (!rivalPokepaste) return
    await navigator.clipboard.writeText(rivalPokepaste)
    setCopiedRival(true)
    window.setTimeout(() => setCopiedRival(false), 2000)
  }

  if (loading || playerId === null) return null

  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      {isParticipant && (
        <div className="mb-5 rounded-xl border border-sky-500/30 bg-sky-950/25 p-4 shadow-[0_0_20px_rgba(14,165,233,0.08)]">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Rival actual</p>
          <p className="mt-1 text-xl font-black text-sky-100">{rivalName ?? 'Ninguno'}</p>
          {rivalName && allDelivered && rivalPokepaste ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-sky-500/20 pt-3">
              <button type="button" onClick={() => setTeamOpen(true)} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-sky-400">VER EQUIPO</button>
              <button type="button" onClick={copyRivalPokepaste} className="rounded-lg border border-sky-500/50 px-4 py-2 text-sm font-bold text-sky-300 hover:bg-sky-500/10">{copiedRival ? 'Copiado' : 'Copiar'}</button>
            </div>
          ) : rivalName ? (
            <p className="mt-3 border-t border-sky-500/20 pt-3 text-sm text-sky-200/70">Podrás ver su equipo cuando todos suban el PokéPaste.</p>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-400">Torneo</p>
          <h2 className="mt-1 text-xl font-black text-zinc-100">Tu PokéPaste</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${savedPokepaste.trim() ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
          {savedPokepaste.trim() ? 'Entregado' : 'Pendiente'}
        </span>
      </div>
      {pokepaste ? (
        <div className="mt-4 space-y-3">
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-200">{pokepaste}</pre>
          <button type="button" onClick={copyOwnPokepaste} className="rounded-lg border border-teal-500/50 px-4 py-2 text-sm font-bold text-teal-300 hover:bg-teal-500/10">
            {copiedOwn ? 'Copiado' : 'Copiar mi PokéPaste'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Forma tu equipo desde tu caja para generar tu PokéPaste.</p>
      )}
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      {teamOpen && rivalName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Equipo de {rivalName}</h2>
              <button type="button" onClick={() => setTeamOpen(false)} className="text-zinc-400">Cerrar</button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-200">{rivalPokepaste}</pre>
          </div>
        </div>
      )}
    </aside>
  )
}
