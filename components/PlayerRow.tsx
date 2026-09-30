import Link from 'next/link'
import { spriteUrl } from '@/lib/sprites'
import type { Player, Pokemon } from '@/lib/types'

type Props = {
  player: Player
  team: Pokemon[]
  medals?: boolean[]
  isYou: boolean
}

export default function PlayerRow({ player, team, medals = [], isYou }: Props) {
  return (
    <Link
      href={`/jugadores/${player.id}`}
      className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4 hover:border-zinc-600"
      style={{ borderLeftWidth: 4, borderLeftColor: player.color }}
    >
      <div
        className="flex w-full justify-between gap-1"
        aria-label={`${medals.filter(Boolean).length} de 12 medallas conseguidas`}
      >
        {Array.from({ length: 12 }, (_, index) => {
          const obtained = medals[index] === true
          const column = index % 8
          const row = Math.floor(index / 8)
          return (
            <span
              key={index}
              title={`Medalla ${index + 1}${obtained ? ' conseguida' : ' pendiente'}`}
              aria-label={`Medalla ${index + 1}: ${obtained ? 'conseguida' : 'pendiente'}`}
              className={`h-6 w-6 shrink-0 bg-[length:192px_48px] bg-no-repeat ${
                obtained ? '' : 'grayscale opacity-30'
              }`}
              style={{
                backgroundImage: "url('/medals/badges.png')",
                backgroundPosition: `${column * -24}px ${row * -24}px`,
              }}
            />
          )
        })}
      </div>
      <div className="flex min-w-0 items-center gap-5">
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
      </div>
    </Link>
  )
}
