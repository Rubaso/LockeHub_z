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
  playerId: number
  name: string
  pokemonId: number
  nature: string
  ability: string
  shiny: boolean
  isTeam: boolean
  status: 'alive' | 'dead'
  route: string
  tramo: number
}

export type Evolution = {
  fromName: string
  fromId: number
  toName: string
  toId: number
  tramo: number
  playerId: number
}

export type FeedItem = {
  id: string
  type: 'capture' | 'death' | 'evolution'
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
