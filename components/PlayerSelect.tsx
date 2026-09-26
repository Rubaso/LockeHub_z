'use client'

import { PLAYERS } from '@/lib/constants'
import type { Player } from '@/lib/types'

type Props = {
  value: number
  onChange: (id: number) => void
  players?: Player[]
}

export default function PlayerSelect({ value, onChange, players = PLAYERS }: Props) {
  return (
    <label className="flex flex-col gap-1 max-w-xs">
      <span className="text-xs uppercase tracking-wide text-zinc-400">Jugador</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
      >
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    </label>
  )
}
