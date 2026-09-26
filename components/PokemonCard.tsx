import { spriteUrl } from '@/lib/sprites'
import type { Pokemon } from '@/lib/types'

export default function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
      <img
        src={spriteUrl(pokemon.pokemonId, pokemon.shiny)}
        alt={pokemon.name}
        className="mx-auto h-16 w-16"
      />
      <h3 className="mt-1 text-sm font-semibold text-zinc-100">{pokemon.name}</h3>
      <p className="text-[11px] text-teal-300/90">NAT. {pokemon.nature}</p>
      <p className="text-[11px] text-zinc-400">HAB. {pokemon.ability}</p>
    </article>
  )
}
