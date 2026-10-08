import { spriteUrl } from '@/lib/sprites'
import { abilityNameInSpanish } from '@/lib/abilityNames'
import MarkShinyButton from './MarkShinyButton'
import ShinyIcon from './ShinyIcon'
import type { Pokemon, Tramo } from '@/lib/types'

type Props = {
  tramo: Tramo
  captures: Pokemon[]
  fallen: Pokemon[]
}

function MiniSprite({
  name,
  pokemonId,
  faded = false,
  detail,
  pokemon,
  ability,
  markingShiny = false,
}: {
  name: string
  pokemonId: number
  faded?: boolean
  detail?: string | null
  pokemon?: Pokemon
  ability?: string
  markingShiny?: boolean
}) {
  const speciesName = pokemon?.name || name
  const nickname = pokemon?.nickname

  return (
    <div
      className={`group relative w-24 rounded-lg border p-2 text-center ${
        faded ? 'border-rose-900/60 bg-rose-950/30 opacity-70' : 'border-zinc-700 bg-zinc-900'
      }`}
    >
      {markingShiny && pokemon && <MarkShinyButton pokemon={pokemon} />}
      <div className="relative mx-auto w-fit">
        {pokemonId ? (
          <>
            <img
              src={spriteUrl(pokemonId, !!pokemon?.shiny)}
              alt={speciesName}
              className="h-20 w-20"
            />
            {pokemon?.shiny && <ShinyIcon className="absolute right-0 top-0 h-5 w-5 text-amber-300" />}
          </>
        ) : null}
      </div>
      <p className="truncate text-[11px] text-zinc-200">{speciesName}</p>
      {nickname && nickname !== speciesName && (
        <p className="truncate text-[10px] text-zinc-400" title={`Mote: ${nickname}`}>
          {nickname}
        </p>
      )}
      {ability && (
        <p className="mt-1 text-[9px] leading-tight text-zinc-400">
          HAB. {abilityNameInSpanish(ability)}
        </p>
      )}
      {detail && <p className="mt-1 text-[9px] text-rose-200/80">{detail}</p>}
    </div>
  )
}

export default function TramoCard({ tramo, captures, fallen, markingShiny = false }: Props & { markingShiny?: boolean }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <header className="mb-4 border-b border-zinc-800 pb-3">
        <div className="mb-2 flex items-center gap-4">
          <img
            src={tramo.leaderSprite}
            alt={tramo.leader}
            className="h-16 w-16 object-contain"
          />
          <h2 className="text-xl font-bold tracking-wide text-zinc-100">{tramo.title}</h2>
        </div>
        <p className="text-sm text-zinc-400">Líder: {tramo.leader}</p>
      </header>

      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-400">
            Capturas {captures.length}
          </h3>
          <div className="flex flex-wrap gap-2">
            {captures.length === 0 && <p className="text-sm text-zinc-500">Nada en este tramo.</p>}
            {captures.map((poke) => (
              <MiniSprite
                key={poke.id}
                name={poke.name}
                pokemonId={poke.pokemonId}
                ability={poke.battleData?.ability ?? poke.ability}
                pokemon={poke}
                markingShiny={markingShiny}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            Caídos {fallen.length}
          </h3>
          <div className="flex flex-wrap gap-2">
            {fallen.length === 0 && <p className="text-sm text-zinc-500">Sin bajas.</p>}
            {fallen.map((poke) => (
              <MiniSprite
                key={poke.id}
                name={poke.name}
                pokemonId={poke.pokemonId}
                ability={poke.battleData?.ability ?? poke.ability}
                faded
                pokemon={poke}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
