'use client'

import { spriteUrl } from '@/lib/sprites'
import { abilityNameInSpanish } from '@/lib/abilityNames'
import type { Pokemon } from '@/lib/types'
import DeletePokemonButton from './DeletePokemonButton'

export default function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <article className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
      <DeletePokemonButton pokemon={pokemon} />
      <img
        src={spriteUrl(pokemon.pokemonId, pokemon.shiny)}
        alt={pokemon.name}
        className="mx-auto h-16 w-16"
      />
      <h3 className="mt-1 text-sm font-semibold text-zinc-100">{pokemon.name}</h3>
      {pokemon.level && <p className="text-[11px] text-zinc-400">Nivel {pokemon.level}</p>}
      {pokemon.captureSource && (
        <p className="text-[11px] text-zinc-400">
          Origen: {{
            wild: 'Salvaje',
            gift: 'Regalo',
            egg: 'Huevo',
            static: 'Estático',
          }[pokemon.captureSource] ?? pokemon.captureSource}
        </p>
      )}
      <p className="text-[11px] text-zinc-400">HAB. {abilityNameInSpanish(pokemon.ability)}</p>
    </article>
  )
}
