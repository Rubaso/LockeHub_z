import type { Pokemon } from './types'
import pokemonZBattleData from './pokemon-z-battle-data.json'

const STAT_NAMES = [
  ['hp', 'HP'],
  ['atk', 'Atk'],
  ['def', 'Def'],
  ['spa', 'SpA'],
  ['spd', 'SpD'],
  ['spe', 'Spe'],
] as const

const battleDataMaps = pokemonZBattleData as {
  items: Record<string, { showdown: string }>
  abilities: Record<string, { showdown: string }>
  moves: Record<string, { showdown: string }>
}

function showdownName(value: string): string {
  return value
    .replace(/[_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function showdownPokemonName(value: string): string {
  return value
    .replace(/[_]+/g, '-')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-')
}

function showdownBattleName(
  value: string,
  map: Record<string, { showdown: string }>
): string {
  const numericId = Number(value)
  if (Number.isInteger(numericId)) {
    return map[String(numericId)]?.showdown ?? value
  }

  return showdownName(value)
}

export function pokemonToShowdown(pokemon: Pokemon): string {
  const data = pokemon.battleData
  const name = pokemon.nickname ? `${pokemon.nickname} (${showdownPokemonName(pokemon.name)})` : showdownPokemonName(pokemon.name)
  const lines = [name + (data?.item ? ` @ ${showdownBattleName(data.item, battleDataMaps.items)}` : '')]

  if (data?.ability) lines.push(`Ability: ${showdownBattleName(data.ability, battleDataMaps.abilities)}`)
  if (data?.level) lines.push(`Level: ${data.level}`)
  if (data?.nature) lines.push(`${showdownName(data.nature)} Nature`)

  const ivs = STAT_NAMES
    .map(([key, label]) => {
      const value = data?.ivs?.[key]
      return typeof value === 'number' ? `${value} ${label}` : null
    })
    .filter((value): value is string => Boolean(value))
  if (ivs.length > 0) lines.push(`IVs: ${ivs.join(' / ')}`)

  for (const move of data?.moves ?? []) {
    lines.push(`- ${showdownBattleName(move, battleDataMaps.moves)}`)
  }

  return lines.join('\n')
}

export function teamToShowdown(team: Pokemon[]): string {
  return team.map(pokemonToShowdown).join('\n\n')
}
