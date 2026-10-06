export type SessionPlayer = {
  id: number
  name: string
}

export type Player = {
  id: number
  name: string
  twitchUser: string
  color: string
}

export type Pokemon = {
  id: number
  savePokemonId: string | null
  playerId: number
  name: string
  nickname: string | null
  pokemonId: number
  nature: string
  ability: string
  shiny: boolean
  isTeam: boolean
  status: 'alive' | 'dead'
  route: string
  tramo: number
  battleData: PokemonBattleData | null
}

export type PokemonBattleData = {
  ability: string | null
  item: string | null
  nature: string | null
  gender: string | null
  level: number | null
  ivs: Record<string, number> | null
  moves: string[]
}

export type FeedItem = {
  id: string
  type: 'capture' | 'death'
  playerName: string
  pokemonName: string
  pokemonId: number
  when: string
}

export type Tramo = {
  id: number
  title: string
  leader: string
  leaderSprite: string
}
