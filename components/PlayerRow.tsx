import Link from 'next/link'
import { spriteUrl } from '@/lib/sprites'
import type { Player, Pokemon } from '@/lib/types'

type Props = {
  player: Player
  team: Pokemon[]
  isYou: boolean
}

export default function PlayerRow({ player, team, isYou }: Props) {
  return (
    <Link
      href={`/jugadores/${player.id}`}
      className="flex items-center gap-5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 hover:border-zinc-600"
      style={{ borderLeftWidth: 4, borderLeftColor: player.color }}
    >
      <div className="min-w-36 shrink-0">
        <p className="font-semibold" style={{ color: player.color }}>
          {player.name}
        </p>
        {isYou && (
          <span className="mt-1 inline-block rounded bg-teal-500/20 px-1.5 text-[10px] font-bold uppercase text-teal-300">
            Tú
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-nowrap items-center gap-2">
        {team.length === 0 && (
          <span className="text-xs text-zinc-500">Sin equipo aún</span>
        )}
        {team.map((poke) => (
          <img
            key={poke.id}
            src={spriteUrl(poke.pokemonId, poke.shiny)}
            alt={poke.name}
            title={poke.name}
            className="h-20 w-20 shrink-0 object-contain"
          />
        ))}
      </div>
    </Link>
  )
}
