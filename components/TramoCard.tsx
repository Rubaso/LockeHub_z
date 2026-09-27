import { spriteUrl } from '@/lib/sprites'
import { abilityNameInSpanish } from '@/lib/abilityNames'
import DeletePokemonButton from './DeletePokemonButton'
import type { Evolution, Pokemon, Tramo } from '@/lib/types'

type Props = {
  tramo: Tramo
  captures: Pokemon[]
  fallen: Pokemon[]
  evolutions: Evolution[]
}

function MiniSprite({
  name,
  pokemonId,
  faded = false,
  detail,
  pokemon,
  ability,
}: {
  name: string
  pokemonId: number
  faded?: boolean
  detail?: string | null
  pokemon?: Pokemon
  ability?: string
}) {
  return (
    <div
      className={`group relative w-24 rounded-lg border p-2 text-center ${
        faded ? 'border-rose-900/60 bg-rose-950/30 opacity-70' : 'border-zinc-700 bg-zinc-900'
      }`}
    >
      {pokemon && <DeletePokemonButton pokemon={pokemon} />}
      <img src={spriteUrl(pokemonId)} alt={name} className="mx-auto h-20 w-20" />
      <p className="truncate text-[11px] text-zinc-200">{name}</p>
      {ability && (
        <p className="mt-1 text-[9px] leading-tight text-zinc-400">
          HAB. {abilityNameInSpanish(ability)}
        </p>
      )}
      {detail && <p className="mt-1 text-[9px] text-rose-200/80">{detail}</p>}
    </div>
  )
}

export default function TramoCard({ tramo, captures, fallen, evolutions }: Props) {
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
                ability={poke.ability}
                pokemon={poke}
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
                ability={poke.ability}
                faded
                pokemon={poke}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300/90">
            Evoluciones {evolutions.length}
          </h3>
          <div className="flex flex-wrap gap-3">
            {evolutions.length === 0 && (
              <p className="text-sm text-zinc-500">Sin evoluciones en este tramo.</p>
            )}
            {evolutions.map((evo) => (
              <div
                key={`${evo.fromId}-${evo.toId}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2"
              >
                <MiniSprite name={evo.fromName} pokemonId={evo.fromId} />
                <span className="text-zinc-500">→</span>
                <MiniSprite name={evo.toName} pokemonId={evo.toId} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
