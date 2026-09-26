export function spriteUrl(pokemonId: number, shiny = false) {
  if (!pokemonId) return ''
  const folder = shiny ? 'shiny' : ''
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
  return folder ? `${base}/${folder}/${pokemonId}.png` : `${base}/${pokemonId}.png`
}
