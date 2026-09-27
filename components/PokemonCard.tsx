'use client'

import { spriteUrl } from '@/lib/sprites'
import { abilityNameInSpanish } from '@/lib/abilityNames'
import type { Pokemon } from '@/lib/types'
import DeletePokemonButton from './DeletePokemonButton'

export default function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <article className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-center">
      <DeletePokemonButton pokemon={pokemon} />
      <img
        src={spriteUrl(pokemon.pokemonId, pokemon.shiny)}
        alt={pokemon.name}
        className="mx-auto h-30 w-30"
      />
      <h3 className="mt-1 text-sm font-semibold text-zinc-100">{pokemon.name}</h3>
      <p className="text-[11px] text-zinc-400">HAB. {abilityNameInSpanish(pokemon.ability)}</p>
    </article>
  )
}
