'use client'

import { spriteUrl } from '@/lib/sprites'
import { abilityNameInSpanish } from '@/lib/abilityNames'
import type { Pokemon } from '@/lib/types'
import DeletePokemonButton from './DeletePokemonButton'
import ShinyIcon from './ShinyIcon'

export default function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <article className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-center">
      <DeletePokemonButton pokemon={pokemon} />
      <div className="relative mx-auto w-fit">
        <img
          src={spriteUrl(pokemon.pokemonId, pokemon.shiny)}
          alt={pokemon.name}
          className="h-30 w-30"
        />
        {pokemon.shiny && <ShinyIcon className="absolute right-0 top-0 h-5 w-5 text-amber-300" />}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-zinc-100">{pokemon.name}</h3>
      <p className="text-[11px] text-zinc-400">HAB. {abilityNameInSpanish(pokemon.ability)}</p>
    </article>
  )
}
